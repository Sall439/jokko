"""Tests des modèles de l'app `appointments`."""

from datetime import date, time, timedelta

import pytest
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.utils import IntegrityError
from freezegun import freeze_time

from apps.appointments.models import Appointment
from apps.appointments.tests.factories import AppointmentFactory
from apps.catalog.tests.factories import SoinFactory
from apps.core.utils import combine_local
from apps.notifications.models import Notification
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db

LUNDI = combine_local(date(2030, 6, 3), time(9, 0))


def test_str_rendez_vous() -> None:
    rdv = AppointmentFactory()
    assert str(rdv.patient) in str(rdv)
    assert rdv.soin.nom in str(rdv)
    assert "03/06/2030" not in str(rdv)  # la date affichée suit le début choisi


def test_duree_minutes() -> None:
    soin = SoinFactory(duree_minutes=45)
    rdv = AppointmentFactory(soin=soin, debut=LUNDI)
    assert rdv.duree_minutes == 45
    assert rdv.fin - rdv.debut == timedelta(minutes=45)


def test_est_actif_selon_le_statut() -> None:
    rdv = AppointmentFactory()
    assert rdv.est_actif is True
    for statut in (Appointment.Statut.TERMINE, Appointment.Statut.ABSENT):
        rdv.statut = statut
        assert rdv.est_actif is True
    rdv.statut = Appointment.Statut.ANNULE
    assert rdv.est_actif is False


def test_transitions_autorisees() -> None:
    rdv = AppointmentFactory(statut=Appointment.Statut.PENDING)
    assert rdv.peut_transitionner_vers(Appointment.Statut.CONFIRMED) is True
    assert rdv.peut_transitionner_vers(Appointment.Statut.TERMINE) is False
    assert rdv.prochain_statut() == Appointment.Statut.CONFIRMED

    rdv.statut = Appointment.Statut.CONFIRMED
    assert rdv.peut_transitionner_vers(Appointment.Statut.TERMINE) is True
    assert rdv.peut_transitionner_vers(Appointment.Statut.ABSENT) is True


def test_annule_est_un_etat_final() -> None:
    rdv = AppointmentFactory(statut=Appointment.Statut.ANNULE)
    assert rdv.TRANSITIONS[Appointment.Statut.ANNULE] == ()
    assert rdv.peut_transitionner_vers(Appointment.Statut.CONFIRMED) is False


def test_fin_avant_debut_refuse_par_la_contrainte() -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        AppointmentFactory(debut=LUNDI, fin=LUNDI - timedelta(minutes=30))


def test_double_debut_au_meme_endroit_refuse() -> None:
    """Filet portable : unicité (praticien, début) hors rendez-vous annulés."""
    rdv = AppointmentFactory(debut=LUNDI)
    with pytest.raises(IntegrityError), transaction.atomic():
        AppointmentFactory(praticien=rdv.praticien, debut=LUNDI)

    # ... sauf si le premier est annulé.
    rdv.statut = Appointment.Statut.ANNULE
    rdv.motif_annulation = "Désistement"
    rdv.save()
    assert AppointmentFactory(praticien=rdv.praticien, debut=LUNDI).pk is not None


def test_chevauchement_interdit_par_la_contrainte_d_exclusion() -> None:
    """09h00-10h00 puis 09h30-10h30 : seul le créneau de 09h est disponible."""
    rdv = AppointmentFactory(debut=LUNDI, fin=LUNDI + timedelta(minutes=60))
    with pytest.raises(IntegrityError), transaction.atomic():
        AppointmentFactory(
            praticien=rdv.praticien,
            debut=LUNDI + timedelta(minutes=30),
            fin=LUNDI + timedelta(minutes=90),
        )


def test_chevauchement_autorise_avec_un_annule() -> None:
    rdv = AppointmentFactory(debut=LUNDI)
    rdv.statut = Appointment.Statut.ANNULE
    rdv.motif_annulation = "Désistement"
    rdv.save()
    assert (
        AppointmentFactory(
            praticien=rdv.praticien, debut=LUNDI + timedelta(minutes=15)
        ).pk
        is not None
    )


def test_chevauchement_entre_deux_praticiens_autorise() -> None:
    rdv = AppointmentFactory(debut=LUNDI)
    autre = AppointmentFactory(
        praticien=PractitionerFactory(), debut=LUNDI, fin=LUNDI + timedelta(hours=1)
    )
    assert rdv.pk != autre.pk


def test_chevauchement_adjacent_non_conflit() -> None:
    """Un rendez-vous qui commence exactement quand l'autre finit est permis."""
    rdv = AppointmentFactory(debut=LUNDI, fin=LUNDI + timedelta(minutes=60))
    assert AppointmentFactory(praticien=rdv.praticien, debut=rdv.fin).pk is not None


def test_clean_exige_un_motif_pour_une_annulation() -> None:
    rdv = AppointmentFactory.build(
        statut=Appointment.Statut.ANNULE, motif_annulation=""
    )
    with pytest.raises(ValidationError) as exc:
        rdv.clean()
    assert "motif_annulation" in exc.value.message_dict


def test_clean_exige_une_date_annulation() -> None:
    rdv = AppointmentFactory.build(
        statut=Appointment.Statut.ANNULE, motif_annulation="Congé", annule_le=None
    )
    with pytest.raises(ValidationError) as exc:
        rdv.clean()
    assert "annule_le" in exc.value.message_dict


def test_save_horodate_la_confirmation() -> None:
    rdv = AppointmentFactory()
    assert rdv.confirme_le is None
    rdv.statut = Appointment.Statut.CONFIRMED
    rdv.save()
    assert rdv.confirme_le is not None


def test_save_horodate_l_annulation() -> None:
    rdv = AppointmentFactory()
    rdv.statut = Appointment.Statut.ANNULE
    rdv.motif_annulation = "Empêchement"
    rdv.save()
    assert rdv.annule_le is not None


def test_delete_annule_au_lieu_de_supprimer() -> None:
    rdv = AppointmentFactory()
    pk = rdv.pk
    rdv.delete()
    assert Appointment.objects.filter(pk=pk).exists()
    relu = Appointment.objects.get(pk=pk)
    assert relu.statut == Appointment.Statut.ANNULE
    assert relu.motif_annulation


def test_delete_est_refuse_sur_un_queryset() -> None:
    """`QuerySet.delete()` annule en masse au lieu de supprimer."""
    rdv = AppointmentFactory()
    modifies, _ = Appointment.objects.filter(pk=rdv.pk).delete()
    assert modifies == 1
    assert Appointment.objects.get(pk=rdv.pk).statut == Appointment.Statut.ANNULE


def test_hard_delete_supprime_reellement() -> None:
    """Échappatoire de maintenance : `hard_delete()` purge vraiment."""
    rdv = AppointmentFactory()
    pk = rdv.pk
    Appointment.objects.filter(pk=pk).hard_delete()
    assert not Appointment.objects.filter(pk=pk).exists()
    # Les notifications liées sont supprimées en cascade (CASCADE), pas orphelines.
    assert not Notification.objects.filter(rendez_vous_id=pk).exists()


@freeze_time("2030-06-01 10:00:00+00:00")
def test_patient_nom_et_praticien_nom() -> None:
    rdv = AppointmentFactory()
    assert rdv.patient_nom == f"{rdv.patient.prenom} {rdv.patient.nom}"
    assert rdv.praticien_nom == str(rdv.praticien)
