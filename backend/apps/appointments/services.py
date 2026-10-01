"""Services de l'app `appointments`.

Toute la logique métier (réservation, confirmation, annulation, clôture) vit
ici : les vues ne font que sérialiser / déléguer.

Protocole anti-double réservation :

    1. on ouvre une transaction ;
    2. on verrouille la ligne du praticien (`select_for_update`) : deux
       réservations concurrentes sur le même praticien sont donc sérialisées ;
    3. on revalide *intégralement* le créneau (horaires, congés, conflits) à
       l'intérieur de ce verrou ;
    4. la contrainte d'exclusion PostgreSQL reste le filet de sécurité pour
       les écritures concurrentes directes en base.
"""

from datetime import timedelta
from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import QuerySet
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.appointments.models import Appointment
from apps.catalog.models import Soin
from apps.core.utils import cancellation_window, ensure_aware, format_xof, now
from apps.practitioners.models import Practitioner

MOTIF_OBLIGATOIRE = "Un motif d'annulation est obligatoire."


# ------------------------------------------------------------------ sélection


def rendez_vous_visibles(user: Any) -> QuerySet[Appointment]:
    """Queryset filtré selon le rôle (patient = les siens, etc.)."""
    from apps.appointments.selectors import get_rendez_vous

    queryset = get_rendez_vous()
    role = getattr(user, "role", None)
    if role == "admin":
        return queryset
    if role == "dentiste":
        return queryset.filter(praticien__user=user)
    return queryset.filter(patient=user)


# ------------------------------------------------------------------ réservation


@transaction.atomic
def reserver(
    *,
    patient: Any,
    praticien: Practitioner,
    soin: Soin,
    debut: Any,
    notes: str = "",
    prix_xof: int | None = None,
) -> Appointment:
    """Réserve un rendez-vous et renvoie l'instance créée.

    Lève `ValidationError` (400) si le créneau n'est pas réservable.
    """
    from apps.availability.services import indisponible_pour

    debut = ensure_aware(debut)

    # 1. Verrou sur le praticien : sérialise les réservations concurrentes.
    _verrouiller_praticien(praticien)

    # 2. Doublon exact pour ce patient (même soin, même début).
    if (
        Appointment.objects.filter(patient=patient, soin=soin, debut=debut)
        .exclude(statut=Appointment.Statut.ANNULE)
        .exists()
    ):
        raise ValidationError(
            {"debut": ["Vous avez déjà un rendez-vous pour ce soin à cette date."]},
            code="duplicate_appointment",
        )

    # 3. Revalidation complète du créneau, sous verrou.
    raison = indisponible_pour(praticien, soin, debut)
    if raison is not None:
        raise ValidationError({"debut": [raison]}, code="slot_unavailable")

    if getattr(patient, "role", None) not in (None, "patient"):
        raise ValidationError(
            {
                "patient": [
                    "Seul un utilisateur avec le rôle « patient » peut réserver."
                ]
            },
            code="invalid_patient",
        )
    if not getattr(patient, "is_active", True):
        raise ValidationError(
            {"patient": ["Ce compte patient est désactivé."]}, code="invalid_patient"
        )

    fin = debut + timedelta(minutes=soin.duree_minutes)
    if prix_xof is None:
        prix_xof = _prix_du_soin(praticien, soin)

    try:
        with transaction.atomic():
            return Appointment.objects.create(
                patient=patient,
                praticien=praticien,
                soin=soin,
                debut=debut,
                fin=fin,
                statut=Appointment.Statut.PENDING,
                prix_xof=prix_xof,
                notes=notes,
            )
    except IntegrityError as exc:  # pragma: no cover - filet de sécurité
        raise ValidationError(
            {
                "debut": [
                    "Ce créneau vient d'être réservé par un autre patient. "
                    "Choisissez-en un autre."
                ]
            },
            code="slot_unavailable",
        ) from exc


def _verrouiller_praticien(praticien: Practitioner) -> Practitioner:
    """Verrouille la ligne du praticien (`SELECT ... FOR UPDATE`)."""
    return (
        Practitioner.objects.select_for_update().filter(pk=praticien.pk).first()
        or praticien
    )


def _prix_du_soin(praticien: Practitioner, soin: Soin) -> int:
    """Tarif effectif proposé par le praticien, sinon prix du catalogue."""
    return (
        praticien.soins_proposes.filter(soin=soin, actif=True)
        .values_list("prix_xof", flat=True)
        .first()
        or soin.prix_xof
    )


# ------------------------------------------------------------------ transitions


@transaction.atomic
def changer_statut(
    rendez_vous: Appointment, cible: str, *, acteur: Any = None, motif: str = ""
) -> Appointment:
    """Applique une transition en respectant la machine à états.

    Lève `ValidationError` (400) si la transition est interdite.
    """
    if not rendez_vous.peut_transitionner_vers(cible):
        cible_lisible = dict(Appointment.Statut.choices).get(cible, cible)
        raise ValidationError(
            {
                "statut": [
                    f"Impossible de passer un rendez-vous "
                    f"« {rendez_vous.get_statut_display()} » à "
                    f"« {cible_lisible} »."
                ]
            },
            code="invalid_transition",
        )

    rendez_vous.statut = cible

    if cible == Appointment.Statut.ANNULE:
        raison = motif.strip()
        if not raison:
            raise ValidationError({"motif": [MOTIF_OBLIGATOIRE]}, code="motif_required")
        rendez_vous.motif_annulation = raison
        rendez_vous.annule_le = now()
        rendez_vous.annule_par = acteur if _est_utilisateur(acteur) else None

    rendez_vous.save(
        update_fields=[
            "statut",
            "updated_at",
            "motif_annulation",
            "annule_le",
            "annule_par",
            "confirme_le",
        ]
    )
    return rendez_vous


def confirmer(rendez_vous: Appointment, *, acteur: Any = None) -> Appointment:
    """Confirme un rendez-vous en attente."""
    return changer_statut(rendez_vous, Appointment.Statut.CONFIRMED, acteur=acteur)


def terminer(rendez_vous: Appointment, *, acteur: Any = None) -> Appointment:
    """Marque un rendez-vous confirmé comme terminé."""
    return changer_statut(rendez_vous, Appointment.Statut.TERMINE, acteur=acteur)


def marquer_absent(rendez_vous: Appointment, *, acteur: Any = None) -> Appointment:
    """Marque le patient comme absent."""
    return changer_statut(rendez_vous, Appointment.Statut.ABSENT, acteur=acteur)


def annuler(
    rendez_vous: Appointment,
    *,
    motif: str,
    acteur: Any = None,
    force: bool = False,
) -> Appointment:
    """Annule un rendez-vous en respectant la fenêtre d'annulation.

    La fenêtre (`APPOINTMENT_CANCELLATION_WINDOW_HOURS`) empêche le patient
    d'annuler trop tard ; `force=True` (administration / suppression) passe
    outre. Dans tous les cas le rendez-vous **n'est jamais supprimé** : le
    statut et le motif sont conservés.
    """
    if not force and not _dans_la_fenetre(rendez_vous):
        heures = int(cancellation_window().total_seconds() // 3600)
        raise ValidationError(
            {
                "motif": [
                    f"Impossible d'annuler moins de {heures} heures avant "
                    "le rendez-vous. Contactez le cabinet."
                ]
            },
            code="cancellation_window_closed",
        )
    return changer_statut(
        rendez_vous, Appointment.Statut.ANNULE, acteur=acteur, motif=motif
    )


def annuler_rendez_vous(
    rendez_vous: Appointment,
    *,
    motif: str,
    acteur: Any = None,
    force: bool = False,
) -> Appointment:
    """Alias explicite (utilisé par `Appointment.delete`)."""
    return annuler(rendez_vous, motif=motif, acteur=acteur, force=force)


def _dans_la_fenetre(rendez_vous: Appointment) -> bool:
    """Le délai avant le début du rendez-vous permet-il encore d'annuler ?"""
    return rendez_vous.debut - now() >= cancellation_window()


def peut_annuler(rendez_vous: Appointment, *, force: bool = False) -> bool:
    """L'annulation est-elle possible (statut + fenêtre de 24 h) ?

    Prédicat pur : ne modifie rien, utilisé par les serializers.
    """
    if not rendez_vous.peut_transitionner_vers(Appointment.Statut.ANNULE):
        return False
    return force or _dans_la_fenetre(rendez_vous)


def _est_utilisateur(acteur: Any) -> bool:
    return acteur is not None and getattr(acteur, "pk", None) is not None


# ------------------------------------------------------------------ requêtes


def rendez_vous_du_jour(praticien: Practitioner, jour: Any) -> QuerySet[Appointment]:
    """Rendez-vous actifs d'un praticien pour une date locale donnée."""
    from apps.appointments.selectors import get_rendez_vous
    from apps.core.utils import end_of_local_day, start_of_local_day

    return get_rendez_vous().filter(
        praticien=praticien,
        debut__gte=start_of_local_day(jour),
        debut__lte=end_of_local_day(jour),
        statut__in=Appointment.STATUTS_ACTIFS,
    )


def conflicts_avec(
    praticien: Practitioner, debut: Any, fin: Any
) -> QuerySet[Appointment]:
    """Rendez-vous actifs du praticien chevauchant l'intervalle donné."""
    from apps.appointments.selectors import get_rendez_vous

    return get_rendez_vous().filter(
        praticien=praticien,
        statut__in=Appointment.STATUTS_ACTIFS,
        debut__lt=fin,
        fin__gt=debut,
    )


def formater_resume(rendez_vous: Appointment) -> str:
    """Résumé lisible (utilisé par les notifications et l'admin)."""
    return (
        f"{rendez_vous.patient_nom} — {rendez_vous.soin.nom} "
        f"le {timezone.localtime(rendez_vous.debut):%d/%m/%Y à %H:%M} "
        f"({format_xof(rendez_vous.prix_xof)})"
    )


#: Constante ré-exportée pour l'app `availability`.
STATUTS_ACTIFS = Appointment.STATUTS_ACTIFS
