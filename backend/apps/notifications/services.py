"""Services de l'app `notifications`.

    * ``notifier()``      : crée **et** envoie (mode synchrone par défaut) ;
    * ``envoyer()``       : distribue une notification existante ;
    * ``envoyer_rappels()`` : relance les rendez-vous confirmés à venir.

Le déclenchement se fait par signaux (jamais dans les vues) ; le mode
asynchrone (`NOTIFICATIONS_ASYNC=True`) se contente de créer la notification
avec le statut ``pending`` : une file (Celery, en production) prendra le
relais. En développement, l'envoi est immédiat.
"""

from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db.models import QuerySet
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.core.utils import format_xof, local_date
from apps.notifications.channels import NotificationError, expedier
from apps.notifications.models import Notification

#: Sujets par type (en français, comme le reste de l'application).
SUJETS: dict[str, str] = {
    Notification.Type.RDV_CREE: "Demande de rendez-vous reçue",
    Notification.Type.RDV_CONFIRME: "Rendez-vous confirmé",
    Notification.Type.RDV_ANNULE: "Rendez-vous annulé",
    Notification.Type.RDV_ABSENT: "Vous avez été marqué absent",
    Notification.Type.RAPPEL: "Rappel : votre rendez-vous approche",
}


def _intitule_praticien(rdv: Appointment) -> str:
    return f"{rdv.praticien.user.prenom} {rdv.praticien.user.nom}"


def _format_date(rdv: Appointment) -> str:
    local = rdv.debut.astimezone()  # ISO 8601 complet avec fuseau
    jour = local_date(rdv.debut).strftime("%d/%m/%Y")
    return f"{jour} à {local:%H:%M}"


def _contenu(notification_type: str, rdv: Appointment | None) -> tuple[str, str]:
    """Génère le couple (sujet, message) à partir du rendez-vous."""
    sujet = SUJETS.get(notification_type, "Notification JokkoDentiste")

    if rdv is None:
        return sujet, "Greetings du cabinet JokkoDentiste."

    lignes = [
        f"Bonjour {rdv.patient.prenom},",
        "",
    ]
    lignes.append(f"▸ Soin : {rdv.soin.nom}")
    lignes.append(f"▸ Praticien : {_intitule_praticien(rdv)}")
    lignes.append(f"▸ Date : {_format_date(rdv)}")
    lignes.append(f"▸ Montant : {format_xof(rdv.prix_xof)}")

    entete: dict[str, str] = {
        Notification.Type.RDV_CREE: (
            "Votre demande de rendez-vous a bien été enregistrée :"
        ),
        Notification.Type.RDV_CONFIRME: (
            "Votre rendez-vous a été confirmé par le cabinet :"
        ),
        Notification.Type.RDV_ANNULE: (
            f"Votre rendez-vous a été annulé"
            f"{' (' + rdv.motif_annulation + ')' if rdv.motif_annulation else ''} :"
        ),
        Notification.Type.RDV_ABSENT: (
            "Vous n'avez pas pu être reçu à votre rendez-vous :"
        ),
        Notification.Type.RAPPEL: (
            "Ceci est un rappel pour votre rendez-vous à venir :"
        ),
    }
    message = "\n".join([entete.get(notification_type, ""), "", *lignes, "",
                         "Cordialement,",
                         "Le cabinet JokkoDentiste"])
    return sujet, message.strip()


def _canal_effectif(canal: str | None) -> str:
    """Le SMS est un canal optionnel : sans lui, on bascule sur l'email."""
    if canal == Notification.Canal.SMS and not getattr(
        settings, "NOTIFICATIONS_SMS_ENABLED", False
    ):
        return Notification.Canal.EMAIL
    return canal or Notification.Canal.EMAIL


def creer_notification(
    *,
    destinataire: Any,
    notification_type: str,
    rendez_vous: Appointment | None = None,
    canal: str | None = None,
) -> Notification:
    """Persiste une notification (sujet + message générés)."""
    canal = _canal_effectif(canal)
    sujet, message = _contenu(notification_type, rendez_vous)
    return Notification.objects.create(
        destinataire=destinataire,
        rendez_vous=rendez_vous,
        type=notification_type,
        canal=canal,
        sujet=sujet,
        message=message,
    )


def envoyer(notification: Notification) -> Notification:
    """Distribue une notification et met à jour son statut."""
    notification.statut = Notification.Statut.EN_ATTENTE
    notification.erreur = ""
    notification.envoi_le = None
    try:
        expedier(notification)
    except NotificationError as exc:
        notification.statut = Notification.Statut.ECHEC
        notification.erreur = str(exc)
    else:
        notification.statut = Notification.Statut.ENVOYEE
        notification.envoi_le = timezone.now()
    notification.save(update_fields=["statut", "erreur", "envoi_le", "updated_at"])
    return notification


def notifier(
    *,
    destinataire: Any,
    notification_type: str,
    rendez_vous: Appointment | None = None,
    canal: str | None = None,
) -> Notification:
    """Crée une notification et l'envoie (immédiat si mode synchrone)."""
    notification = creer_notification(
        destinataire=destinataire,
        notification_type=notification_type,
        rendez_vous=rendez_vous,
        canal=canal,
    )
    if not getattr(settings, "NOTIFICATIONS_ASYNC", False):
        return envoyer(notification)
    return notification  # pragma: no cover - file Celery en production


def notifications_visibles(user: Any) -> QuerySet[Notification]:
    """Notifications que peut lire ``user``.

        * ``admin``      : toutes ;
        * ``dentiste``   : les siennes + celles liées à son agenda ;
        * ``patient``    : les siennes uniquement.
    """
    from apps.notifications.selectors import get_notifications

    if getattr(user, "role", None) == "admin":
        return get_notifications()
    base = get_notifications().filter(destinataire=user)
    if getattr(user, "role", None) == "dentiste":
        base = base | get_notifications().filter(
            rendez_vous__praticien__user=user
        )
    return base.distinct()


def rendez_vous_avec_rappel() -> QuerySet[Appointment]:
    """Rendez-vous confirmés à venir pas encore rappelés (optimisé)."""
    from apps.appointments.models import Appointment

    return (
        Appointment.objects.select_related("patient", "praticien__user", "soin")
        .filter(
            statut=Appointment.Statut.CONFIRMED,
            debut__gte=timezone.now(),
        )
        .exclude(
            notifications__type__in=Notification.TYPES_RAPPEL,
            notifications__canal=Notification.Canal.EMAIL,
        )
    )


def _deja_rappe(rdv: Appointment) -> bool:
    return Notification.objects.filter(
        rendez_vous=rdv,
        type__in=Notification.TYPES_RAPPEL,
        canal=Notification.Canal.EMAIL,
    ).exists()


def envoyer_rappels(*, horizon: timedelta | None = None) -> int:
    """Crée et envoie les rappels des rendez-vous confirmés à venir.

    Idempotente : un rendez-vous déjà rappelé (même type + canal) n'est pas
    re-notifié. Renvoie le nombre de rappels réellement envoyés.
    """
    if horizon is None:
        horizon = timedelta(hours=24)
    limite = timezone.now() + horizon
    envoyes = 0
    for rdv in rendez_vous_avec_rappel().filter(debut__lte=limite).iterator():
        if _deja_rappe(rdv):
            continue
        try:
            notification = notifier(
                destinataire=rdv.patient,
                notification_type=Notification.Type.RAPPEL,
                rendez_vous=rdv,
            )
            if notification.statut != Notification.Statut.ECHEC:
                envoyes += 1
        except NotificationError:
            # L'échec d'envoi n'interrompt pas la campagne ; le statut de la
            # notification garde la trace (statut `failed`) pour reprise.
            continue
    return envoyes
