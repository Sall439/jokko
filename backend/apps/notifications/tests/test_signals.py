"""Tests des signaux : les notifications suivent le cycle de vie du rendez-vous."""

from datetime import date, time, timedelta

import pytest
from django.test import override_settings
from freezegun import freeze_time

from apps.appointments.models import Appointment
from apps.appointments.services import (
    annuler,
    confirmer,
    marquer_absent,
    reserver,
)
from apps.appointments.tests.factories import AppointmentFactory
from apps.core.utils import combine_local, now
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def _rdv() -> Appointment:
    """Rendez-vous loin dans le futur (fenêtre d'annulation ouverte)."""
    return AppointmentFactory(debut=now() + timedelta(days=3))


def _types_pour(rdv: Appointment) -> set[str]:
    return set(
        Notification.objects.filter(rendez_vous=rdv).values_list("type", flat=True)
    )


def test_creation_genere_une_notification_rdv_cree() -> None:
    rdv = _rdv()
    assert Notification.Type.RDV_CREE in _types_pour(rdv)
    notification = Notification.objects.get(
        rendez_vous=rdv, type=Notification.Type.RDV_CREE
    )
    # `rdv.patient_id` (instance fraîche, pk str issue de la factory) vs
    # `destinataire_id` (rechargé depuis la base, uuid.UUID) : on compare via str.
    assert str(notification.destinataire_id) == str(rdv.patient_id)
    assert notification.statut == Notification.Statut.ENVOYEE


def test_confirmation_genere_une_notification() -> None:
    rdv = _rdv()
    confirmer(rdv)
    assert Notification.Type.RDV_CONFIRME in _types_pour(rdv)


def test_annulation_genere_une_notification_avec_motif() -> None:
    rdv = _rdv()
    annuler(rdv, motif="Urgence familiale")
    assert Notification.Type.RDV_ANNULE in _types_pour(rdv)
    notification = Notification.objects.get(
        rendez_vous=rdv, type=Notification.Type.RDV_ANNULE
    )
    assert "Urgence familiale" in notification.message


def test_absent_genere_une_notification() -> None:
    rdv = _rdv()
    marquer_absent(rdv)
    assert Notification.Type.RDV_ABSENT in _types_pour(rdv)


def test_sauvegarde_sans_changement_ne_notifie_pas() -> None:
    rdv = _rdv()
    rdv.notes = "Pas de changement de statut"
    rdv.save(update_fields=["notes", "updated_at"])
    assert _types_pour(rdv) == {Notification.Type.RDV_CREE}


@override_settings(NOTIFICATIONS_ENABLED=False)
def test_notifications_desactivees() -> None:
    rdv = _rdv()
    confirmer(rdv)
    assert Notification.objects.filter(rendez_vous=rdv).count() == 0


def test_aucune_notification_si_statut_initial_pas_pending() -> None:
    rdv = AppointmentFactory(
        statut=Appointment.Statut.CONFIRMED, debut=now() + timedelta(days=3)
    )
    assert Notification.objects.filter(rendez_vous=rdv).count() == 0


def test_reservation_via_service_notifie() -> None:
    """Le chemin API complet (reserver) déclenche la notification."""
    from apps.accounts.tests.factories import PatientFactory
    from apps.availability.tests.factories import HoraireHebdomadaireFactory
    from apps.catalog.tests.factories import SoinFactory
    from apps.practitioners.services import proposer_soin
    from apps.practitioners.tests.factories import PractitionerFactory

    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=0, heure_debut=time(9, 0), heure_fin=time(13, 0)
    )
    soin = SoinFactory(duree_minutes=60)
    proposer_soin(praticien, soin)

    patient = PatientFactory()
    with freeze_time("2030-06-01 07:00:00+00:00"):
        rdv = reserver(
            patient=patient,
            praticien=praticien,
            soin=soin,
            debut=combine_local(date(2030, 6, 3), time(9, 0)),
        )
    assert Notification.Type.RDV_CREE in _types_pour(rdv)


def test_rappel_du_cycle_complet() -> None:
    """Création -> confirmation -> annulation : 3 notifications, pas plus."""
    rdv = _rdv()
    confirmer(rdv)
    annuler(rdv, motif="Changement de planning")
    assert _types_pour(rdv) == {
        Notification.Type.RDV_CREE,
        Notification.Type.RDV_CONFIRME,
        Notification.Type.RDV_ANNULE,
    }
