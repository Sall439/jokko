"""Tests des services de l'app `appointments`."""

from datetime import date, time, timedelta
from typing import Any

import pytest
from freezegun import freeze_time
from rest_framework.exceptions import ValidationError

from apps.appointments.models import Appointment
from apps.appointments.services import (
    annuler,
    changer_statut,
    confirmer,
    conflicts_avec,
    formater_resume,
    marquer_absent,
    peut_annuler,
    rendez_vous_du_jour,
    reserver,
    terminer,
)
from apps.appointments.tests.factories import AppointmentFactory
from apps.availability.tests.factories import (
    ExceptionDisponibiliteFactory,
    HoraireHebdomadaireFactory,
)
from apps.catalog.tests.factories import SoinFactory
from apps.core.utils import combine_local
from apps.practitioners.services import proposer_soin
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db

# On se place le 1er juin 2030 : le lundi 3 juin est dans un futur lointain et
# chaque jour de la semaine a un horaire 09h-13h.
INSTANT = "2030-06-01 07:00:00+00:00"
LUNDI = date(2030, 6, 3)


def _plateau(jour_semaine: int = 0) -> tuple[Any, Any]:
    """Praticien (avec horaires) + soin proposé, prêt à réserver."""
    praticien = PractitionerFactory()
    for jour in range(7):
        if jour != jour_semaine:
            continue
        HoraireHebdomadaireFactory(
            praticien=praticien,
            jour=jour,
            heure_debut=time(9, 0),
            heure_fin=time(13, 0),
        )
    soin = SoinFactory(duree_minutes=60)
    proposer_soin(praticien, soin)
    return praticien, soin


def _patient() -> Any:
    from apps.accounts.tests.factories import PatientFactory

    return PatientFactory()


# ------------------------------------------------------------------ réservation


@freeze_time(INSTANT)
def test_reservation_reussie() -> None:
    praticien, soin = _plateau()
    patient = _patient()
    debut = combine_local(LUNDI, time(9, 0))

    rdv = reserver(patient=patient, praticien=praticien, soin=soin, debut=debut)

    assert rdv.statut == Appointment.Statut.PENDING
    assert rdv.fin == debut + timedelta(minutes=60)
    assert rdv.prix_xof == soin.prix_xof
    assert rdv.confirme_le is None


@freeze_time(INSTANT)
def test_reservation_utilise_le_tarif_du_praticien() -> None:
    praticien, soin = _plateau()
    proposer_soin(praticien, soin, prix_xof=9900)
    rdv = reserver(
        patient=_patient(),
        praticien=praticien,
        soin=soin,
        debut=combine_local(LUNDI, time(9, 0)),
    )
    assert rdv.prix_xof == 9900


@freeze_time(INSTANT)
def test_reservation_dans_le_passee_refusee() -> None:
    praticien, soin = _plateau()
    with pytest.raises(ValidationError) as exc:
        reserver(
            patient=_patient(),
            praticien=praticien,
            soin=soin,
            debut=combine_local(date(2030, 5, 27), time(9, 0)),
        )
    assert "passé" in str(exc.value.detail["debut"])


@freeze_time(INSTANT)
def test_reservation_hors_horaires_refusee() -> None:
    praticien, soin = _plateau()
    with pytest.raises(ValidationError) as exc:
        reserver(
            patient=_patient(),
            praticien=praticien,
            soin=soin,
            debut=combine_local(LUNDI, time(20, 0)),
        )
    assert "horaires" in str(exc.value.detail["debut"])


@freeze_time(INSTANT)
def test_reservation_pendant_un_conge_refusee() -> None:
    praticien, soin = _plateau()
    ExceptionDisponibiliteFactory(praticien=praticien, date=LUNDI, motif="Congé")
    with pytest.raises(ValidationError) as exc:
        reserver(
            patient=_patient(),
            praticien=praticien,
            soin=soin,
            debut=combine_local(LUNDI, time(9, 0)),
        )
    assert "indisponible" in str(exc.value.detail["debut"])


@freeze_time(INSTANT)
def test_reservation_soin_non_propose_refusee() -> None:
    praticien, _ = _plateau()
    autre_soin = SoinFactory()
    with pytest.raises(ValidationError) as exc:
        reserver(
            patient=_patient(),
            praticien=praticien,
            soin=autre_soin,
            debut=combine_local(LUNDI, time(9, 0)),
        )
    assert "ne propose pas" in str(exc.value.detail["debut"])


@freeze_time(INSTANT)
def test_reservation_soin_trop_long_refusee() -> None:
    praticien, soin = _plateau()
    soin.duree_minutes = 600
    soin.save()
    with pytest.raises(ValidationError):
        reserver(
            patient=_patient(),
            praticien=praticien,
            soin=soin,
            debut=combine_local(LUNDI, time(9, 0)),
        )


@freeze_time(INSTANT)
def test_preavis_minimal_refuse() -> None:
    praticien, soin = _plateau()
    with freeze_time("2030-06-03 08:30:00+00:00"):
        with pytest.raises(ValidationError) as exc:
            reserver(
                patient=_patient(),
                praticien=praticien,
                soin=soin,
                debut=combine_local(LUNDI, time(9, 0)),
            )
    assert "préavis" in str(exc.value.detail["debut"])


@freeze_time(INSTANT)
def test_double_reservation_meme_creneau_refusee() -> None:
    praticien, soin = _plateau()
    debut = combine_local(LUNDI, time(9, 0))
    reserver(patient=_patient(), praticien=praticien, soin=soin, debut=debut)

    with pytest.raises(ValidationError):
        reserver(patient=_patient(), praticien=praticien, soin=soin, debut=debut)


@freeze_time(INSTANT)
def test_chevauchement_refuse() -> None:
    """09h00-10h00 puis tentative 09h30 : refusée (chevauchement)."""
    praticien, soin = _plateau()
    reserver(
        patient=_patient(),
        praticien=praticien,
        soin=soin,
        debut=combine_local(LUNDI, time(9, 0)),
    )
    with pytest.raises(ValidationError):
        reserver(
            patient=_patient(),
            praticien=praticien,
            soin=soin,
            debut=combine_local(LUNDI, time(9, 30)),
        )


@freeze_time(INSTANT)
def test_creneau_adjacent_accepte() -> None:
    """10h00-11h00 après 09h00-10h00 : pas de conflit."""
    praticien, soin = _plateau()
    reserver(
        patient=_patient(),
        praticien=praticien,
        soin=soin,
        debut=combine_local(LUNDI, time(9, 0)),
    )
    assert (
        reserver(
            patient=_patient(),
            praticien=praticien,
            soin=soin,
            debut=combine_local(LUNDI, time(10, 0)),
        ).pk
        is not None
    )


@freeze_time(INSTANT)
def test_meme_patient_meme_soin_meme_creneau_refuse() -> None:
    praticien, soin = _plateau()
    patient = _patient()
    debut = combine_local(LUNDI, time(9, 0))
    reserver(patient=patient, praticien=praticien, soin=soin, debut=debut)
    with pytest.raises(ValidationError) as exc:
        reserver(patient=patient, praticien=praticien, soin=soin, debut=debut)
    assert "déjà un rendez-vous" in str(exc.value.detail["debut"])


@freeze_time(INSTANT)
def test_meme_patient_peut_reprendre_un_creneau_annule() -> None:
    praticien, soin = _plateau()
    patient = _patient()
    debut = combine_local(LUNDI, time(9, 0))
    rdv = reserver(patient=patient, praticien=praticien, soin=soin, debut=debut)
    annuler(rdv, motif="Désistement", force=True)
    assert reserver(patient=patient, praticien=praticien, soin=soin, debut=debut).pk


@freeze_time(INSTANT)
def test_patient_non_patient_refuse() -> None:
    from apps.accounts.tests.factories import DentistFactory

    praticien, soin = _plateau()
    with pytest.raises(ValidationError) as exc:
        reserver(
            patient=DentistFactory(),
            praticien=praticien,
            soin=soin,
            debut=combine_local(LUNDI, time(9, 0)),
        )
    assert "patient" in exc.value.detail


@freeze_time(INSTANT)
def test_compte_patient_desactive_refuse() -> None:
    from apps.accounts.tests.factories import PatientFactory

    praticien, soin = _plateau()
    patient = PatientFactory(is_active=False)
    with pytest.raises(ValidationError) as exc:
        reserver(
            patient=patient,
            praticien=praticien,
            soin=soin,
            debut=combine_local(LUNDI, time(9, 0)),
        )
    assert "désactivé" in str(exc.value.detail["patient"])


@freeze_time(INSTANT)
def test_reservation_avec_prix_explicite() -> None:
    praticien, soin = _plateau()
    rdv = reserver(
        patient=_patient(),
        praticien=praticien,
        soin=soin,
        debut=combine_local(LUNDI, time(9, 0)),
        prix_xof=5000,
        notes="Première visite",
    )
    assert rdv.prix_xof == 5000
    assert rdv.notes == "Première visite"


# ------------------------------------------------------------------ transitions


@freeze_time(INSTANT)
def test_confirmation_et_cloture() -> None:
    praticien, soin = _plateau()
    rdv = reserver(
        patient=_patient(),
        praticien=praticien,
        soin=soin,
        debut=combine_local(LUNDI, time(9, 0)),
    )
    confirmer(rdv)
    assert rdv.statut == Appointment.Statut.CONFIRMED
    assert rdv.confirme_le is not None

    terminer(rdv)
    assert rdv.statut == Appointment.Statut.TERMINE


@freeze_time(INSTANT)
def test_marquer_absent() -> None:
    rdv = AppointmentFactory(debut=combine_local(LUNDI, time(9, 0)))
    marquer_absent(rdv)
    assert rdv.statut == Appointment.Statut.ABSENT


def test_transition_invalide_refusee() -> None:
    rdv = AppointmentFactory(statut=Appointment.Statut.PENDING)
    with pytest.raises(ValidationError) as exc:
        changer_statut(rdv, Appointment.Statut.TERMINE)
    assert "invalid_transition" in str(exc.value.get_codes())


def test_transition_depuis_annule_refusee() -> None:
    rdv = AppointmentFactory(
        statut=Appointment.Statut.ANNULE, motif_annulation="Annulé"
    )
    with pytest.raises(ValidationError):
        confirmer(rdv)


def test_annulation_exige_un_motif() -> None:
    # Loin dans le futur : seule la règle du motif peut faire échouer l'appel.
    rdv = AppointmentFactory(debut=combine_local(date(2030, 6, 3), time(9, 0)))
    with pytest.raises(ValidationError) as exc:
        annuler(rdv, motif="   ")
    assert "motif_required" in str(exc.value.get_codes())


def test_annulation_conserve_motif_auteur_et_date() -> None:
    from apps.accounts.tests.factories import AdminFactory

    rdv = AppointmentFactory()
    admin = AdminFactory()
    annuler(rdv, motif="Urgence familiale", acteur=admin, force=True)

    relu = Appointment.objects.get(pk=rdv.pk)
    assert relu.statut == Appointment.Statut.ANNULE
    assert relu.motif_annulation == "Urgence familiale"
    assert str(relu.annule_par_id) == str(admin.id)
    assert relu.annule_le is not None


def test_annulation_hors_fenetre_refusee_pour_le_patient() -> None:
    """Moins de 24 h avant le rendez-vous : le patient ne peut plus annuler."""
    from apps.accounts.tests.factories import PatientFactory

    rdv = AppointmentFactory(statut=Appointment.Statut.PENDING)
    rdv.patient = PatientFactory()
    rdv.debut = combine_local(date.today(), time(10, 0))
    rdv.save()

    # On se place 2 h avant le rendez-vous.
    with freeze_time(rdv.debut - timedelta(hours=2)):
        assert peut_annuler(rdv) is False
        with pytest.raises(ValidationError) as exc:
            annuler(rdv, motif="Trop tard", force=False)
    assert "cancellation_window_closed" in str(exc.value.get_codes())


def test_annulation_avec_force_ignore_la_fenetre() -> None:
    rdv = AppointmentFactory()
    with freeze_time(rdv.debut - timedelta(minutes=5)):
        assert peut_annuler(rdv) is False
        annuler(rdv, motif="Administration", force=True)
    assert rdv.statut == Appointment.Statut.ANNULE


def test_annulation_bien_avant_est_autorisee() -> None:
    rdv = AppointmentFactory()
    with freeze_time(rdv.debut - timedelta(days=3)):
        assert peut_annuler(rdv) is True
        annuler(rdv, motif="Changement de planning", force=False)
    assert rdv.statut == Appointment.Statut.ANNULE


def test_peut_annuler_faux_si_transition_impossible() -> None:
    rdv = AppointmentFactory(statut=Appointment.Statut.ANNULE, motif_annulation="x")
    assert peut_annuler(rdv) is False


# --------------------------------------------------------------------- requêtes


def test_rendez_vous_du_jour() -> None:
    from apps.core.utils import combine_local as _combine

    praticien = PractitionerFactory()
    rdv = AppointmentFactory(praticien=praticien, debut=_combine(LUNDI, time(9, 0)))
    assert list(rendez_vous_du_jour(praticien, LUNDI)) == [rdv]
    assert list(rendez_vous_du_jour(praticien, LUNDI + timedelta(days=1))) == []


def test_conflicts_avec_ignore_les_annules() -> None:
    rdv = AppointmentFactory(
        debut=combine_local(LUNDI, time(9, 0)), fin=combine_local(LUNDI, time(9, 30))
    )
    assert list(
        conflicts_avec(
            rdv.praticien,
            combine_local(LUNDI, time(9, 0)),
            combine_local(LUNDI, time(9, 30)),
        )
    ) == [rdv]

    annuler(rdv, motif="Libre", force=True)
    assert (
        list(
            conflicts_avec(
                rdv.praticien,
                combine_local(LUNDI, time(9, 0)),
                combine_local(LUNDI, time(9, 30)),
            )
        )
        == []
    )


@freeze_time(INSTANT)
def test_rendez_vous_visibles_par_role() -> None:
    from apps.accounts.tests.factories import AdminFactory, DentistFactory
    from apps.appointments.services import rendez_vous_visibles

    patient = _patient()
    autre_patient = _patient()
    praticien = PractitionerFactory()
    autre_praticien = PractitionerFactory()

    # Trois créneaux distincts : la contrainte d'exclusion l'exige.
    mon_rdv = AppointmentFactory(
        patient=patient, praticien=praticien, debut=combine_local(LUNDI, time(9, 0))
    )
    rdv_autre_patient = AppointmentFactory(
        patient=autre_patient,
        praticien=praticien,
        debut=combine_local(LUNDI, time(10, 0)),
    )
    rdv_autre_praticien = AppointmentFactory(
        patient=patient,
        praticien=autre_praticien,
        debut=combine_local(LUNDI, time(9, 0)),
    )

    assert set(rendez_vous_visibles(patient)) == {mon_rdv, rdv_autre_praticien}
    assert set(rendez_vous_visibles(praticien.user)) == {mon_rdv, rdv_autre_patient}
    assert set(rendez_vous_visibles(AdminFactory())) == {
        mon_rdv,
        rdv_autre_patient,
        rdv_autre_praticien,
    }
    assert set(rendez_vous_visibles(DentistFactory())) == set()


def test_formater_resume() -> None:
    resume = formater_resume(AppointmentFactory())
    assert "FCFA" in resume
