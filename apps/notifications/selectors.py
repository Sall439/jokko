"""Querysets optimisés de l'app `notifications` (aucun N+1)."""

from typing import Any

from django.db.models import QuerySet

from apps.notifications.models import Notification


def get_notifications() -> QuerySet[Notification]:
    """Queryset de base : relations pré-chargées et tri antéchronologique."""
    return Notification.objects.select_related(
        "destinataire",
        "rendez_vous",
        "rendez_vous__praticien__user",
        "rendez_vous__soin",
    ).order_by("-created_at")


def get_notifications_du_user(user: Any) -> QuerySet[Notification]:
    """Notifications destinées à cet utilisateur (non admin)."""
    return get_notifications().filter(destinataire=user)
