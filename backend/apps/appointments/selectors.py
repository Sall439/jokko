"""Querysets optimisés de l'app `appointments` (aucun N+1)."""

from datetime import date
from typing import Any
from uuid import UUID

from django.db.models import QuerySet
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.core.utils import end_of_local_day, start_of_local_day
from apps.practitioners.models import Practitioner


def get_rendez_vous() -> QuerySet[Appointment]:
    """Queryset de base : `select_related` sur toutes les clés étrangères."""
    return Appointment.objects.select_related(
        "patient",
        "praticien",
        "praticien__user",
        "praticien__cabinet",
        "soin",
        "soin__categorie",
    ).order_by("-debut")


def get_rendez_vous_actifs() -> QuerySet[Appointment]:
    """Rendez-vous qui occupent l'agenda (hors annulés)."""
    return get_rendez_vous().filter(statut__in=Appointment.STATUTS_ACTIFS)


def get_agenda_du_jour(
    praticien: Practitioner | UUID, jour: date
) -> QuerySet[Appointment]:
    """Rendez-vous actifs d'un praticien pour un jour local."""
    return get_rendez_vous_actifs().filter(
        praticien=praticien,
        debut__gte=start_of_local_day(jour),
        debut__lte=end_of_local_day(jour),
    )


def get_avenir(user: Any, limite: int = 5) -> QuerySet[Appointment]:
    """Prochains rendez-vous d'un patient, du plus proche au plus lointain."""
    return (
        get_rendez_vous_actifs()
        .filter(patient=user, debut__gte=timezone.now())
        .order_by("debut")[:limite]
    )
