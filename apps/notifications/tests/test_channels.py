"""Tests des canaux d'envoi (`apps.notifications.channels`)."""

import logging
from typing import Any

import pytest
from django.test import override_settings

from apps.accounts.tests.factories import PatientFactory
from apps.notifications import channels
from apps.notifications.channels import NotificationError, expedier
from apps.notifications.models import Notification
from apps.notifications.tests.factories import NotificationFactory

pytestmark = pytest.mark.django_db


def test_email_va_au_backend_console() -> None:
    """En développement, l'email part via le backend Django (console)."""
    notification = NotificationFactory(canal=Notification.Canal.EMAIL)
    with override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    ):
        from django.core import mail

        expedier(notification)
    assert len(mail.outbox) == 1
    assert notification.sujet in mail.outbox[0].subject
    assert mail.outbox[0].to == [notification.destinataire.email]


def test_email_refuse_est_un_echec(monkeypatch: pytest.MonkeyPatch) -> None:
    """Un backend qui n'envoie rien remonte une `NotificationError`."""
    notification = NotificationFactory(canal=Notification.Canal.EMAIL)

    def rien_envoye(*args: Any, **kwargs: Any) -> int:
        return 0

    monkeypatch.setattr(channels, "send_mail", rien_envoye)
    with pytest.raises(NotificationError) as info:
        expedier(notification)
    assert "refusé" in str(info.value)


def test_email_transforme_une_erreur_en_notification_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    notification = NotificationFactory(canal=Notification.Canal.EMAIL)

    def exploser(*args: Any, **kwargs: Any) -> int:
        raise OSError("connexion SMTP refusée")

    monkeypatch.setattr(channels, "send_mail", exploser)
    with pytest.raises(NotificationError) as info:
        expedier(notification)
    assert "SMTP" in str(info.value)


@pytest.mark.parametrize(
    "canal,marqueur",
    [
        (Notification.Canal.SMS, "[SMS →"),
        (Notification.Canal.WHATSAPP, "[WhatsApp →"),
    ],
)
def test_sms_et_whatsapp_sont_journalises(
    canal: str, marqueur: str, caplog: pytest.LogCaptureFixture
) -> None:
    """Sans provider externe, SMS et WhatsApp sont tracés (canal observable)."""
    patient = PatientFactory(telephone="+221771234567")
    notification = NotificationFactory(destinataire=patient, canal=canal)
    with caplog.at_level(logging.INFO, logger="jokko.notifications"):
        expedier(notification)
    assert any(
        marqueur in record.message
        or marqueur in record.getMessage()
        for record in caplog.records
    )
    assert "+221771234567" in caplog.text


def test_sms_sans_numero_est_journalise_avec_un_repli(
    caplog: pytest.LogCaptureFixture,
) -> None:
    patient = PatientFactory()
    patient.telephone = ""
    patient.save(update_fields=["telephone"])
    notification = NotificationFactory(
        destinataire=patient, canal=Notification.Canal.SMS
    )
    notification.destinataire.telephone = ""
    with caplog.at_level(logging.INFO, logger="jokko.notifications"):
        expedier(notification)
    assert "numéro inconnu" in caplog.text


def test_canal_inconnu_refuse() -> None:
    notification = NotificationFactory()
    notification.canal = "carrier-pigeon"
    with pytest.raises(NotificationError) as info:
        expedier(notification)
    assert "Canal inconnu" in str(info.value)


def test_table_de_routage_couvre_tous_les_canaux() -> None:
    canaux = {canal.value for canal in Notification.Canal}
    assert set(channels.CANAUX) == canaux
