"""Tests du calcul de créneaux (`apps.availability.services`)."""

from datetime import date, time, timedelta

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.utils import IntegrityError
from freezegun import freeze_time
from rest_framework.exceptions import ValidationError

from apps.availability.services import (
    blocking_ranges,
    creneaux_du_jour,
    indisponible_pour,
    liste_creneaux,
    prochain_creneau,
    working_windows,
)
from apps.availability.tests.factories import (
    ExceptionDisponibiliteFactory,
    HoraireHebdomadaireFactory,
)
from apps.catalog.tests.factories import SoinFactory
from apps.core.utils import combine_local
from apps.practitioners.services import proposer_soin
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db

# Reference : un lundi.
LUNDI = date(2030, 6, 3)


def _praticien_avec_horaires():
    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=0, heure_debut=time(9, 0), heure_fin=time(13, 0)
    )
    soin = SoinFactory(duree_minutes=60)
    proposer_soin(praticien, soin)
    return praticien, soin


# ------------------------------------------------------------------ working_windows


def test_working_windows_renvoie_les_plages_du_jour() -> None:
    praticien, _ = _praticien_avec_horaires()
    plages = working_windows(praticien, LUNDI)
    assert len(plages) == 1
    assert plages[0].debut == combine_local(LUNDI, time(9, 0))
    assert plages[0].fin == combine_local(LUNDI, time(13, 0))


def test_working_windows_ignore_les_horaires_inactifs() -> None:
    praticien, _ = _praticien_avec_horaires()
    praticien.horaires.update(actif=False)
    assert working_windows(praticien, LUNDI) == []


def test_working_windows_autre_jour_vide() -> None:
    praticien, _ = _praticien_avec_horaires()
    assert working_windows(praticien, LUNDI + timedelta(days=1)) == []


# ------------------------------------------------------------------ liste_creneaux


@freeze_time("2030-06-03 07:00:00+00:00")
def test_liste_creneaux_respecte_la_duree_du_soin() -> None:
    """Créneaux de 60 min, début toutes les 30 min, dans une fenêtre 09h-13h."""
    praticien, soin = _praticien_avec_horaires()
    creneaux = liste_creneaux(praticien, soin, LUNDI, LUNDI)
    assert [c.debut.strftime("%H:%M") for c in creneaux] == [
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
    ]
    assert creneaux[0].debut == combine_local(LUNDI, time(9, 0))
    assert creneaux[-1].fin == combine_local(LUNDI, time(13, 0))
    assert creneaux[0].fin - creneaux[0].debut == timedelta(minutes=soin.duree_minutes)


@freeze_time("2030-06-03 07:00:00+00:00")
def test_granularite_de_30_minutes() -> None:
    praticien, soin = _praticien_avec_horaires()
    soin.duree_minutes = 30
    soin.save()
    creneaux = liste_creneaux(praticien, soin, LUNDI, LUNDI)
    assert len(creneaux) == 8
    assert creneaux[1].debut - creneaux[0].debut == timedelta(minutes=30)


@freeze_time("2030-06-03 07:00:00+00:00")
def test_delai_minimum_de_60_minutes() -> None:
    """À 08h30, le créneau de 09h00 est trop proche (< 60 min de préavis)."""
    with freeze_time("2030-06-03 08:30:00+00:00"):
        praticien, soin = _praticien_avec_horaires()
        creneaux = liste_creneaux(praticien, soin, LUNDI, LUNDI)
        assert creneaux and creneaux[0].debut == combine_local(LUNDI, time(9, 30))

    with freeze_time("2030-06-03 08:00:00+00:00"):
        assert liste_creneaux(praticien, soin, LUNDI, LUNDI)[0].debut == combine_local(
            LUNDI, time(9, 0)
        )


@freeze_time("2030-06-03 07:00:00+00:00")
def test_horizon_de_reservation() -> None:
    praticien, soin = _praticien_avec_horaires()
    # 90 jours : le lundi 2030-08-26 est hors horizon (90 jours après le 03/06).
    loin = LUNDI + timedelta(days=90)
    assert liste_creneaux(praticien, soin, loin, loin) == []


@freeze_time("2030-06-03 07:00:00+00:00")
def test_periode_dans_le_passee_exclue() -> None:
    praticien, soin = _praticien_avec_horaires()
    assert (
        liste_creneaux(
            praticien, soin, LUNDI - timedelta(days=7), LUNDI - timedelta(days=1)
        )
        == []
    )


@freeze_time("2030-06-03 07:00:00+00:00")
def test_conge_journee_entiere_bloque_tous_les_creneaux() -> None:
    praticien, soin = _praticien_avec_horaires()
    ExceptionDisponibiliteFactory(praticien=praticien, date=LUNDI, motif="Congé")
    assert liste_creneaux(praticien, soin, LUNDI, LUNDI) == []


@freeze_time("2030-06-03 07:00:00+00:00")
def test_conge_partiel_bloque_une_partie_des_creneaux() -> None:
    """Congé de 11h à 14h : seuls les créneaux finissant avant 11h restent."""
    praticien, soin = _praticien_avec_horaires()
    ExceptionDisponibiliteFactory(
        praticien=praticien,
        date=LUNDI,
        heure_debut=time(11, 0),
        heure_fin=time(14, 0),
    )
    creneaux = liste_creneaux(praticien, soin, LUNDI, LUNDI)
    assert [c.debut.strftime("%H:%M") for c in creneaux] == ["09:00", "09:30", "10:00"]


@freeze_time("2030-06-03 07:00:00+00:00")
def test_rendez_vous_existant_bloque_un_creneau() -> None:
    from apps.appointments.models import Appointment
    from apps.appointments.tests.factories import AppointmentFactory

    praticien, soin = _praticien_avec_horaires()
    AppointmentFactory(
        praticien=praticien,
        soin=soin,
        debut=combine_local(LUNDI, time(10, 0)),
        fin=combine_local(LUNDI, time(11, 0)),
    )
    creneaux = liste_creneaux(praticien, soin, LUNDI, LUNDI)
    assert [c.debut.strftime("%H:%M") for c in creneaux] == [
        "09:00",
        "11:00",
        "11:30",
        "12:00",
    ]

    # Un rendez-vous annulé ne bloque plus rien.
    rdv = Appointment.objects.get(praticien=praticien)
    rdv.statut = Appointment.Statut.ANNULE
    rdv.motif_annulation = "Désistement"
    rdv.save()
    assert len(liste_creneaux(praticien, soin, LUNDI, LUNDI)) == 7


@freeze_time("2030-06-03 07:00:00+00:00")
def test_soin_non_propose_par_le_praticien() -> None:
    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(praticien=praticien, jour=0)
    soin = SoinFactory()
    assert liste_creneaux(praticien, soin, LUNDI, LUNDI) == []


@freeze_time("2030-06-03 07:00:00+00:00")
def test_soin_desactive_bloque() -> None:
    praticien, soin = _praticien_avec_horaires()
    soin.actif = False
    soin.save()
    assert liste_creneaux(praticien, soin, LUNDI, LUNDI) == []


@freeze_time("2030-06-03 07:00:00+00:00")
def test_soin_trop_long_pour_la_fenetre() -> None:
    praticien, soin = _praticien_avec_horaires()
    soin.duree_minutes = 300
    soin.save()
    assert liste_creneaux(praticien, soin, LUNDI, LUNDI) == []


@freeze_time("2030-06-03 07:00:00+00:00")
def test_prochain_creneau_saute_le_conge() -> None:
    praticien, soin = _praticien_avec_horaires()
    ExceptionDisponibiliteFactory(praticien=praticien, date=LUNDI, motif="Congé")
    # pas d'horaire le mardi : on ouvre une plage le mardi
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=1, heure_debut=time(14, 0), heure_fin=time(18, 0)
    )
    creneau = prochain_creneau(praticien, soin, jour=LUNDI)
    assert creneau is not None
    assert creneau.debut == combine_local(LUNDI + timedelta(days=1), time(14, 0))


@freeze_time("2030-06-03 07:00:00+00:00")
def test_prochain_creneau_inexistant() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    proposer_soin(praticien, soin)
    assert prochain_creneau(praticien, soin, jour=LUNDI) is None


@freeze_time("2030-06-03 07:00:00+00:00")
def test_blocking_ranges_inclut_rendez_et_exceptions() -> None:
    from apps.appointments.tests.factories import AppointmentFactory

    praticien, soin = _praticien_avec_horaires()
    ExceptionDisponibiliteFactory(
        praticien=praticien, date=LUNDI, heure_debut=time(12, 0), heure_fin=time(13, 0)
    )
    AppointmentFactory(
        praticien=praticien,
        debut=combine_local(LUNDI, time(9, 0)),
        fin=combine_local(LUNDI, time(10, 0)),
    )
    assert len(blocking_ranges(praticien, LUNDI)) == 2


# --------------------------------------------------------------- indisponible_pour


@freeze_time("2030-06-03 07:00:00+00:00")
def test_indisponible_dans_le_passe() -> None:
    praticien, soin = _praticien_avec_horaires()
    raison = indisponible_pour(
        praticien, soin, combine_local(LUNDI, time(9, 0)) - timedelta(days=2)
    )
    assert raison == "La date du rendez-vous est dans le passé."


@freeze_time("2030-06-03 07:00:00+00:00")
def test_indisponible_hors_horaires() -> None:
    praticien, soin = _praticien_avec_horaires()
    raison = indisponible_pour(praticien, soin, combine_local(LUNDI, time(20, 0)))
    assert raison == "Le créneau est hors des horaires du praticien."


@freeze_time("2030-06-03 07:00:00+00:00")
def test_indisponible_pendant_un_conge() -> None:
    praticien, soin = _praticien_avec_horaires()
    ExceptionDisponibiliteFactory(praticien=praticien, date=LUNDI)
    raison = indisponible_pour(praticien, soin, combine_local(LUNDI, time(9, 0)))
    assert raison == "Le créneau est déjà indisponible (congé ou rendez-vous pris)."


@freeze_time("2030-06-03 07:00:00+00:00")
def test_indisponible_soin_non_propose() -> None:
    praticien, soin = _praticien_avec_horaires()
    retirer = SoinFactory()
    assert (
        indisponible_pour(praticien, retirer, combine_local(LUNDI, time(9, 0)))
        == "Ce praticien ne propose pas ce soin."
    )


@freeze_time("2030-06-03 07:00:00+00:00")
def test_indisponible_praticien_inactif() -> None:
    praticien, soin = _praticien_avec_horaires()
    praticien.actif = False
    praticien.save()
    assert (
        indisponible_pour(praticien, soin, combine_local(LUNDI, time(9, 0)))
        == "Ce praticien n'accepte plus de rendez-vous."
    )


@freeze_time("2030-06-03 07:00:00+00:00")
def test_creneau_valide_renvoie_none() -> None:
    praticien, soin = _praticien_avec_horaires()
    assert indisponible_pour(praticien, soin, combine_local(LUNDI, time(9, 0))) is None


@freeze_time("2030-06-03 07:00:00+00:00")
def test_assert_reservable_leve_une_validation_error() -> None:
    from apps.availability.services import assert_reservable

    praticien, soin = _praticien_avec_horaires()
    with pytest.raises(ValidationError) as exc:
        assert_reservable(praticien, soin, combine_local(LUNDI, time(20, 0)))
    assert "hors des horaires" in str(exc.value.detail["debut"])


# ------------------------------------------------------------------- divers


def test_exception_check_constraint_applique() -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        ExceptionDisponibiliteFactory(heure_debut=time(9, 0), heure_fin=time(9, 0))


def test_clean_refuse_heures_inversees() -> None:
    exception = ExceptionDisponibiliteFactory.build(
        heure_debut=time(10, 0), heure_fin=time(9, 0)
    )
    with pytest.raises(DjangoValidationError):
        exception.clean()


@freeze_time("2030-06-03 07:00:00+00:00")
def test_creneaux_du_jour_est_un_alias() -> None:
    praticien, soin = _praticien_avec_horaires()
    assert creneaux_du_jour(praticien, soin, LUNDI) == liste_creneaux(
        praticien, soin, LUNDI, LUNDI
    )
