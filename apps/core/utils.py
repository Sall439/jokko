"""Utilitaires transverses : montants en XOF et gestion des dates/heures.

Règle du projet : toutes les dates sont stockées en UTC *aware* ; le fuseau
« métier » (Africa/Dakar par défaut) n'est utilisé que pour l'affichage et le
calcul des créneaux.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone

XOF_SUFFIX = "FCFA"


def business_timezone() -> ZoneInfo:
    """Fuseau métier du cabinet (Africa/Dakar par défaut)."""
    name = str(getattr(settings, "BUSINESS_TIME_ZONE", None) or settings.TIME_ZONE)
    return ZoneInfo(name)


def format_xof(amount: int) -> str:
    """Formate un montant XOF : ``15000`` -> ``"15 000 FCFA"``."""
    return f"{int(amount):,}".replace(",", " ") + f" {XOF_SUFFIX}"


def parse_xof(value: Any) -> int:
    """Convertit une valeur en entier XOF. Lève ``ValueError`` si invalide."""
    if isinstance(value, bool):  # bool est un int : on le refuse explicitement
        raise ValueError("Montant invalide.")
    if isinstance(value, int):
        return value
    try:
        return int(Decimal(str(value)))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError("Montant invalide.") from exc


def now() -> datetime:
    """Heure courante, aware, en UTC."""
    return timezone.now()


def local_now() -> datetime:
    """Heure courante exprimée dans le fuseau métier (aware)."""
    return timezone.now().astimezone(business_timezone())


def ensure_aware(value: datetime) -> datetime:
    """Rend un datetime aware : naive -> fuseau métier, aware -> inchangé."""
    if timezone.is_naive(value):
        return value.replace(tzinfo=business_timezone())
    return value


def as_business_local(value: datetime) -> datetime:
    """Convertit un datetime aware vers le fuseau métier."""
    return ensure_aware(value).astimezone(business_timezone())


def combine_local(day: date, moment: time) -> datetime:
    """Combine une date et une heure locales en un datetime aware (fuseau métier)."""
    return datetime.combine(day, moment, tzinfo=business_timezone())


def local_date(value: datetime | date) -> date:
    """Date locale (fuseau métier) d'un datetime ou d'une date."""
    if isinstance(value, datetime):
        return as_business_local(value).date()
    return value


def start_of_local_day(day: date) -> datetime:
    """Minuit (00:00) du jour donné, aware, dans le fuseau métier."""
    return combine_local(day, time.min)


def end_of_local_day(day: date) -> datetime:
    """Fin de journée (23:59:59.999999) du jour donné, aware."""
    return combine_local(day, time.max)


def iter_days(start: date, end: date) -> list[date]:
    """Liste inclusive des jours entre ``start`` et ``end``."""
    if end < start:
        return []
    return [start + timedelta(days=offset) for offset in range((end - start).days + 1)]


def cancellation_window() -> timedelta:
    """Fenêtre d'annulation configurable (voir settings)."""
    hours = int(getattr(settings, "APPOINTMENT_CANCELLATION_WINDOW_HOURS", 24))
    return timedelta(hours=hours)


def slot_granularity() -> timedelta:
    """Granularité des créneaux (voir settings)."""
    minutes = int(getattr(settings, "APPOINTMENT_SLOT_GRANULARITY_MINUTES", 30))
    return timedelta(minutes=max(minutes, 5))


def booking_horizon() -> timedelta:
    """Horizon de réservation (voir settings)."""
    days = int(getattr(settings, "APPOINTMENT_BOOKING_HORIZON_DAYS", 90))
    return timedelta(days=max(days, 1))


def min_lead_time() -> timedelta:
    """Délai minimum entre maintenant et le début d'un rendez-vous."""
    minutes = int(getattr(settings, "APPOINTMENT_MIN_LEAD_MINUTES", 60))
    return timedelta(minutes=max(minutes, 0))
