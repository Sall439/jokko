"""Canaux d'envoi des notifications.

Abstraction par canal : ``email``, ``sms`` et ``whatsapp`` exposent la même
interface ``envoyer(notification)``. En développement, l'email passe par le
backend console de Django (settings ``EMAIL_BACKEND``) et le SMS / WhatsApp
sont journalisés (sortie console) : aucun service externe n'est requis.

En production, chaque canal est remplacé par son implémentation réelle
(provider email, passerelle SMS, API WhatsApp Business) sans changer
l'appelant : ``expedier()`` route par ``canal``.
"""

import logging
from typing import Any

from django.conf import settings
from django.core.mail import send_mail

LOGGER = logging.getLogger("jokko.notifications")


class NotificationError(Exception):
    """Échec d'envoi d'une notification (remonté au service)."""


def _adresse_retour() -> str:
    return str(
        getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@jokkodentiste.sn")
    )


def _envoyer_email(notification: Any) -> None:
    """Envoie la notification par email (backend console en dev)."""
    try:
        envoyes = send_mail(
            notification.sujet,
            notification.message,
            _adresse_retour(),
            [notification.destinataire.email],
            fail_silently=False,
        )
        if not envoyes:
            raise NotificationError("Email refusé par le serveur d'envoi.")
    except NotificationError:
        raise
    except Exception as exc:  # noqa: BLE001 - toute erreur SMTP = échec
        raise NotificationError(str(exc)) from exc


def _envoyer_sms(notification: Any) -> None:
    """SMS : journalisé en dev, passerelle SMS en production.

    `NOTIFICATIONS_SMS_ENABLED=False` : le service bascule sur l'email avant
    d'appeler ce canal ; ici on ne fait que tracer l'envoi.
    """
    numero = notification.destinataire.telephone or "numéro inconnu"
    LOGGER.info(
        "[SMS → %s] %s — %s",
        numero,
        notification.sujet,
        notification.message,
    )


def _envoyer_whatsapp(notification: Any) -> None:
    """WhatsApp : journalisé en dev, API WhatsApp Business en production."""
    numero = notification.destinataire.telephone or "numéro inconnu"
    LOGGER.info(
        "[WhatsApp → %s] %s — %s",
        numero,
        notification.sujet,
        notification.message,
    )


#: Table de routage : canal -> fonction d'envoi.
CANAUX: dict[str, Any] = {
    "email": _envoyer_email,
    "sms": _envoyer_sms,
    "whatsapp": _envoyer_whatsapp,
}


def expedier(notification: Any) -> None:
    """Distribue une notification sur le bon canal. Lève ``NotificationError``."""
    envoyeur = CANAUX.get(notification.canal)
    if envoyeur is None:
        raise NotificationError(
            f"Canal inconnu : {notification.canal!r}."
        )
    envoyeur(notification)
