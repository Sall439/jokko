"""Signaux : génération des notifications sur le cycle de vie des rendez-vous.

Les notifications sont déclenchées **ici**, jamais dans les vues ni dans les
services métier : tout chemin qui modifie un rendez-vous (API, admin, script)
produit naturellement les bonnes notifications.
"""

from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.appointments.models import Appointment
from apps.notifications.models import Notification
from apps.notifications.services import notifier

#: Statut de rendez-vous -> type de notification.
CORRESPONDANCE: dict[str, str] = {
    Appointment.Statut.CONFIRMED: Notification.Type.RDV_CONFIRME,
    Appointment.Statut.ANNULE: Notification.Type.RDV_ANNULE,
    Appointment.Statut.ABSENT: Notification.Type.RDV_ABSENT,
}


@receiver(pre_save, sender=Appointment)
def _memoriser_statut_avant(
    sender: type[Appointment], instance: Appointment, **kwargs: object
) -> None:
    """Capture le statut précédent pour ne notifier que les vraies transitions."""
    if instance.pk is None:
        instance._statut_avant = None
        return
    precedent = (
        Appointment.objects.filter(pk=instance.pk)
        .values_list("statut", flat=True)
        .first()
    )
    instance._statut_avant = precedent  # type: ignore[attr-defined]


@receiver(post_save, sender=Appointment)
def _notifier_changement_statut(
    sender: type[Appointment], instance: Appointment, created: bool, **kwargs: object
) -> None:
    """Envoie la notification adaptée après création ou transition de statut."""
    if not getattr(settings, "NOTIFICATIONS_ENABLED", True):
        return

    if created:
        if instance.statut == Appointment.Statut.PENDING:
            notifier(
                destinataire=instance.patient,
                notification_type=Notification.Type.RDV_CREE,
                rendez_vous=instance,
            )
        return

    avant = getattr(instance, "_statut_avant", None)
    if avant is None or avant == instance.statut:
        return

    type_notification = CORRESPONDANCE.get(instance.statut)
    if type_notification is None:
        return
    notifier(
        destinataire=instance.patient,
        notification_type=type_notification,
        rendez_vous=instance,
    )
