"""Calcul des creneaux libres (cœur metier de l'app `availability`).

Aucune ecriture en base : la disponibilite est derivee des horaires, des
exceptions et des rendez-vous existants. Toutes les datetimes manipulées
sont *aware*.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any

from django.db.models import QuerySet
from rest_framework.exceptions import ValidationError

from apps.availability.models import ExceptionDisponibilite, HoraireHebdomadaire
from apps.catalog.models import Soin
from apps.core.utils import (
    as_business_local,
    booking_horizon,
    combine_local,
    end_of_local_day,
    iter_days,
    local_date,
    min_lead_time,
    now,
    slot_granularity,
    start_of_local_day,
)
from apps.practitioners.models import Practitioner

#: Statuts de rendez-vous qui bloquent un créneau (tout sauf « annulé »).
STATUTS_BLOQUANTS = ("pending", "confirmed", "completed", "no_show")


@dataclass(frozen=True)
class Creneau:
    """Creneau reservable, exprimes en datetimes aware (UTC en base)."""

    debut: datetime
    fin: datetime


@dataclass(frozen=True)
class Plage:
    """Plage horaire locale `[debut, fin)`."""

    debut: datetime
    fin: datetime

    def chevauche(self, debut: datetime, fin: datetime) -> bool:
        return debut < self.fin and self.debut < fin


def _rendez_vous_du_praticien(
    praticien: Practitioner, debut: datetime, fin: datetime
) -> QuerySet[Any]:
    """Import différé : evite une dépendance circulaire avec `appointments`."""
    from apps.appointments.models import Appointment

    return Appointment.objects.filter(
        praticien=praticien,
        statut__in=STATUTS_BLOQUANTS,
        debut__lt=fin,
        fin__gt=debut,
    )


def working_windows(praticien: Practitioner, jour: date) -> list[Plage]:
    """Plages de travail du `jour` (semaine ISO : lundi = 0)."""
    numero_jour = jour.weekday()
    horaires = (
        HoraireHebdomadaire.objects.filter(
            praticien=praticien, jour=numero_jour, actif=True
        )
        .order_by("heure_debut")
        .values_list("heure_debut", "heure_fin")
    )
    return [
        Plage(combine_local(jour, debut), combine_local(jour, fin))
        for debut, fin in horaires
    ]


def blocking_ranges(praticien: Practitioner, jour: date) -> list[Plage]:
    """Plages indisponibles sur `jour` : exceptions + rendez-vous pris."""
    plages: list[Plage] = []

    exceptions = ExceptionDisponibilite.objects.filter(praticien=praticien, date=jour)
    for exception in exceptions:
        if exception.bloque_toute_la_journee:
            plages.append(Plage(start_of_local_day(jour), end_of_local_day(jour)))
            continue
        plages.append(
            Plage(
                combine_local(jour, exception.heure_debut or time.min),
                combine_local(jour, exception.heure_fin or time.max),
            )
        )

    debut_jour = start_of_local_day(jour)
    fin_jour = end_of_local_day(jour)
    for rdv in _rendez_vous_du_praticien(praticien, debut_jour, fin_jour).only(
        "debut", "fin"
    ):
        plages.append(Plage(rdv.debut, rdv.fin))

    return plages


def indisponible_pour(
    praticien: Practitioner, soin: Soin, debut: datetime
) -> str | None:
    """Retourne la raison du refus, ou `None` si le créneau est réservable.

    Vérifie : passé, délai minimum, horizon, soins proposé, horaires du
    praticien, exceptions (congés) et rendez-vous déjà pris.
    """
    if not getattr(praticien, "actif", True):
        return "Ce praticien n'accepte plus de rendez-vous."

    if not soin.actif:
        return "Ce soin n'est plus proposé par le cabinet."

    if not praticien.propose(soin):
        return "Ce praticien ne propose pas ce soin."

    instant = now()
    if debut < instant:
        return "La date du rendez-vous est dans le passé."

    if debut < instant + min_lead_time():
        minutes = int(min_lead_time().total_seconds() // 60)
        return f"Il faut au moins {minutes} minutes de préavis pour réserver."

    if debut > instant + booking_horizon():
        jours = int(booking_horizon().days)
        return f"Les réservations ne sont ouvertes que {jours} jours à l'avance."

    jour = local_date(debut)
    fin = debut + timedelta(minutes=soin.duree_minutes)

    plages_travail = working_windows(praticien, jour)
    if not any(plage.debut <= debut and fin <= plage.fin for plage in plages_travail):
        return "Le créneau est hors des horaires du praticien."

    for plage in blocking_ranges(praticien, jour):
        if plage.chevauche(debut, fin):
            return "Le créneau est déjà indisponible (congé ou rendez-vous pris)."

    return None


def assert_reservable(praticien: Practitioner, soin: Soin, debut: datetime) -> None:
    """Lever une `ValidationError` si le créneau n'est pas réservable."""
    raison = indisponible_pour(praticien, soin, debut)
    if raison is not None:
        raise ValidationError({"debut": [raison]}, code="slot_unavailable")


def soin_reservable(praticien: Practitioner, soin: Soin) -> bool:
    """Le couple (praticien, soin) peut-il donner lieu à une réservation ?

    Un soin inactif ou non proposé par le praticien ne produit aucun créneau,
    même si les horaires sont ouverts.
    """
    if not getattr(praticien, "actif", True):
        return False
    if not soin.actif:
        return False
    return praticien.propose(soin)


def liste_creneaux(
    praticien: Practitioner,
    soin: Soin,
    date_debut: date,
    date_fin: date,
    *,
    instant: datetime | None = None,
) -> list[Creneau]:
    """Creneaux réservables pour `soin`, du `date_debut` au `date_fin` (inclus)."""
    if not soin_reservable(praticien, soin):
        return []

    maintenant = instant or now()
    duree = timedelta(minutes=soin.duree_minutes)
    granularite = slot_granularity()
    plancher = maintenant + min_lead_time()
    horizon = maintenant + booking_horizon()

    creneaux: list[Creneau] = []
    for jour in iter_days(date_debut, date_fin):
        if not (local_date(plancher) <= jour <= local_date(horizon)):
            continue
        occupations = blocking_ranges(praticien, jour)
        for plage in working_windows(praticien, jour):
            cursor = plage.debut
            while cursor + duree <= plage.fin:
                fin = cursor + duree
                if (
                    cursor >= plancher
                    and cursor <= horizon
                    and not any(p.chevauche(cursor, fin) for p in occupations)
                ):
                    creneaux.append(Creneau(debut=cursor, fin=fin))
                cursor += granularite
    return creneaux


def creneaux_du_jour(
    praticien: Practitioner,
    soin: Soin,
    jour: date,
    *,
    instant: datetime | None = None,
) -> list[Creneau]:
    """Variante d'un seul jour (utilisée par l'endpoint et les tests)."""
    return liste_creneaux(praticien, soin, jour, jour, instant=instant)


def prochain_creneau(
    praticien: Practitioner,
    soin: Soin,
    *,
    jour: date,
    instant: datetime | None = None,
) -> Creneau | None:
    """Premier créneau disponible à partir de `jour` (recherche gloutonne)."""
    maintenant = instant or now()
    debut_recherche = max(jour, local_date(maintenant))
    horizon_date = local_date(maintenant + booking_horizon())
    for jour_cible in iter_days(debut_recherche, horizon_date):
        creneaux = liste_creneaux(
            praticien, soin, jour_cible, jour_cible, instant=maintenant
        )
        if creneaux:
            return creneaux[0]
    return None


def formater_creneau(creneau: Creneau) -> dict[str, Any]:
    """Payload sérialisable d'un créneau (ISO 8601, UTC)."""
    return {
        "debut": creneau.debut.isoformat(),
        "fin": creneau.fin.isoformat(),
        "debut_local": as_business_local(creneau.debut).isoformat(),
        "duree_minutes": int((creneau.fin - creneau.debut).total_seconds() // 60),
    }
