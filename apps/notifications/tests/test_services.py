"""Tests des services de l'app `notifications`."""

from datetime import timedelta

import pytest
from django.test import override_settings

from apps.accounts.tests.factories import AdminFactory, PatientFactory
from apps.appointments.models import Appointment
from apps.appointments.tests.factories import AppointmentFactory
from apps.core.utils import format_xof, now
from apps.notifications.channels import NotificationError
from apps.notifications.models import Notification
from apps.notifications.services import (
    _canal_effectif,
    creer_notification,
    envoyer,
    envoyer_rappels,
    notifications_visibles,
    notifier,
)
from apps.notifications.tests.factories import NotificationFactory, RappelFactory

pytestmark = pytest.mark.django_db


# --------------------------------------------------------------------- création


def test_creer_notification_generer_le_contenu() -> None:
    rdv = AppointmentFactory()
    notification = creer_notification(
        destinataire=rdv.patient,
        notification_type=Notification.Type.RDV_CONFIRME,
        rendez_vous=rdv,
    )
    assert notification.type == Notification.Type.RDV_CONFIRME
    assert notification.canal == Notification.Canal.EMAIL
    assert notification.statut == Notification.Statut.EN_ATTENTE
    assert "Rendez-vous confirmé" in notification.sujet
    assert rdv.patient.prenom in notification.message
    assert rdv.soin.nom in notification.message
    assert format_xof(rdv.prix_xof) in notification.message


def test_creer_notification_sans_rendez_vous() -> None:
    patient = PatientFactory()
    notification = creer_notification(
        destinataire=patient, notification_type=Notification.Type.RDV_CREE
    )
    assert notification.rendez_vous is None
    assert notification.sujet != ""


def test_message_annulation_contient_le_motif() -> None:
    rdv = AppointmentFactory()
    rdv.motif_annulation = "Empêchement familial"
    rdv.save(update_fields=["motif_annulation", "updated_at"])
    notification = creer_notification(
        destinataire=rdv.patient,
        notification_type=Notification.Type.RDV_ANNULE,
        rendez_vous=rdv,
    )
    assert "Empêchement familial" in notification.message


# -------------------------------------------------------------------- canaux


@override_settings(NOTIFICATIONS_SMS_ENABLED=False)
def test_canal_sms_bascule_sur_email_quand_desactive() -> None:
    assert _canal_effectif(Notification.Canal.SMS) == Notification.Canal.EMAIL
    notification = creer_notification(
        destinataire=PatientFactory(),
        notification_type=Notification.Type.RDV_CREE,
        canal=Notification.Canal.SMS,
    )
    assert notification.canal == Notification.Canal.EMAIL


@override_settings(NOTIFICATIONS_SMS_ENABLED=True)
def test_canal_sms_conserve_quand_active() -> None:
    assert _canal_effectif(Notification.Canal.SMS) == Notification.Canal.SMS


# --------------------------------------------------------------------- envoi


def test_envoyer_marque_envoye(monkeypatch: pytest.MonkeyPatch) -> None:
    notification = NotificationFactory(statut=Notification.Statut.EN_ATTENTE)
    appels: list[Notification] = []

    def faux_envoi(notif: Notification) -> None:
        appels.append(notif)

    monkeypatch.setattr("apps.notifications.services.expedier", faux_envoi)

    envoyer(notification)
    assert appels == [notification]
    relue = Notification.objects.get(pk=notification.pk)
    assert relue.statut == Notification.Statut.ENVOYEE
    assert relue.envoi_le is not None
    assert relue.erreur == ""


def test_envoyer_echoue_et_trace_l_erreur(monkeypatch: pytest.MonkeyPatch) -> None:
    notification = NotificationFactory(statut=Notification.Statut.EN_ATTENTE)

    def faux_envoi(notif: Notification) -> None:
        raise NotificationError("SMTP injoignable.")

    monkeypatch.setattr("apps.notifications.services.expedier", faux_envoi)

    envoyer(notification)
    relue = Notification.objects.get(pk=notification.pk)
    assert relue.statut == Notification.Statut.ECHEC
    assert relue.envoi_le is None
    assert relue.erreur == "SMTP injoignable."


@override_settings(NOTIFICATIONS_ASYNC=False)
def test_notifier_envoie_immediatement() -> None:
    notification = notifier(
        destinataire=PatientFactory(),
        notification_type=Notification.Type.RDV_CREE,
    )
    assert notification.statut == Notification.Statut.ENVOYEE


@override_settings(NOTIFICATIONS_ASYNC=True)
def test_notifier_en_file_cree_pending(monkeypatch: pytest.MonkeyPatch) -> None:
    def interdit(*args: object, **kwargs: object) -> None:
        raise AssertionError("Aucun envoi en mode asynchrone.")

    monkeypatch.setattr("apps.notifications.services.envoyer", interdit)
    notification = notifier(
        destinataire=PatientFactory(),
        notification_type=Notification.Type.RDV_CREE,
    )
    assert notification.statut == Notification.Statut.EN_ATTENTE


# ----------------------------------------------------------------- visibilité


def test_patient_ne_voit_que_ses_notifications() -> None:
    patient = PatientFactory()
    mienne = NotificationFactory(destinataire=patient, rendez_vous=None)
    NotificationFactory(rendez_vous=None)

    visibles = notifications_visibles(patient)
    assert list(visibles) == [mienne]


def test_admin_voit_toutes_les_notifications() -> None:
    NotificationFactory(rendez_vous=None)
    NotificationFactory(rendez_vous=None)
    assert notifications_visibles(AdminFactory()).count() == 2


# --------------------------------------------------------------------- rappels


def test_envoyer_rappels_cree_un_rappel() -> None:
    rdv = AppointmentFactory(
        statut=Appointment.Statut.CONFIRMED,
        debut=now() + timedelta(hours=6),
    )
    nb = envoyer_rappels(horizon=timedelta(hours=24))
    assert nb == 1
    rappel = Notification.objects.get(
        rendez_vous=rdv, type=Notification.Type.RAPPEL
    )
    # pk str (instance fraîche) vs uuid.UUID (rechargé) : comparaison via str.
    assert str(rappel.destinataire_id) == str(rdv.patient_id)
    assert rappel.statut == Notification.Statut.ENVOYEE


def test_envoyer_rappels_idempotent() -> None:
    rdv = AppointmentFactory(
        statut=Appointment.Statut.CONFIRMED,
        debut=now() + timedelta(hours=6),
    )
    assert envoyer_rappels(horizon=timedelta(hours=24)) == 1
    assert envoyer_rappels(horizon=timedelta(hours=24)) == 0
    assert Notification.objects.filter(rendez_vous=rdv).count() == 1


def test_envoyer_rappels_ignore_les_rdv_au_dela_de_l_horizon() -> None:
    AppointmentFactory(
        statut=Appointment.Statut.CONFIRMED,
        debut=now() + timedelta(hours=48),
    )
    assert envoyer_rappels(horizon=timedelta(hours=24)) == 0


def test_envoyer_rappels_ignore_les_rdv_pas_confirme() -> None:
    AppointmentFactory(
        statut=Appointment.Statut.PENDING, debut=now() + timedelta(hours=6)
    )
    assert envoyer_rappels(horizon=timedelta(hours=24)) == 0


def test_rappel_existant_non_duplique() -> None:
    """Un rappel déjà émis (autre campagne) n'est pas recréé."""
    rdv = AppointmentFactory(statut=Appointment.Statut.CONFIRMED)
    rappel = RappelFactory(rendez_vous=rdv, destinataire=rdv.patient)
    assert rappel.pk is not None
    assert envoyer_rappels(horizon=timedelta(hours=24)) == 0
