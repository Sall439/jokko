"""Rendez-vous : le cœur métier de l'application.

Un rendez-vous lie un **patient**, un **praticien** et un **soin** du
catalogue. La durée et le prix sont figés à la création (snapshot) afin qu'une
évolution ultérieure du catalogue ne modifie pas l'historique.

Garde-fous anti-double réservation :

    1. `apps.appointments.services.reserver()` valide et verrouille la ligne du
       praticien (`select_for_update`) avant de recontrôler le créneau ;
    2. une contrainte d'exclusion PostgreSQL
       (`appointments_rdv_pas_de_double_reservation`) empêche deux rendez-vous
       actifs de se chevaucher, même en cas d'écriture concurrente directe en
       base. Elle est créée en SQL brut dans la migration car Django 5.2
       n'expose pas encore `ExclusionConstraint`.

Règle : un rendez-vous n'est **jamais** supprimé physiquement ; l'annulation
change le statut et conserve le motif, l'auteur et la date.
"""

from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.catalog.models import Soin
from apps.core.models import BaseModel
from apps.practitioners.models import Practitioner

MOTIF_SUPPRESSION = "Rendez-vous annulé (suppression logique)."


class AppointmentQuerySet(models.QuerySet["Appointment"]):
    """Queryset qui interdit la suppression physique des rendez-vous.

    `QuerySet.delete()` est surchargé pour **annuler** les lignes actives
    (statut + motif + date), exactement comme `Appointment.delete()`. Cela
    garantit qu'aucun appel en cascade (`user.delete()`, script de
    maintenance…) ne puisse effacer l'historique des rendez-vous.
    """

    def delete(self) -> tuple[int, dict[str, int]]:
        return (
            self.exclude(statut=Appointment.Statut.ANNULE).update(
                statut=Appointment.Statut.ANNULE,
                motif_annulation=MOTIF_SUPPRESSION,
                annule_le=timezone.now(),
                updated_at=timezone.now(),
            ),
            {},
        )

    def hard_delete(self) -> tuple[int, dict[str, int]]:
        """Suppression **physique** — réservée à la maintenance / au seed.

        Échappatoire explicite : `delete()` annule par défaut afin qu'aucun
        appel en cascade ne puisse effacer l'historique. Cette méthode n'est
        utilisée que par les scripts qui doivent réellement purger la base
        (`manage.py seed_demo --force`).
        """
        return super().delete()


class Appointment(BaseModel):
    """Un rendez-vous chez un praticien."""

    class Statut(models.TextChoices):
        PENDING = "pending", "En attente de confirmation"
        CONFIRMED = "confirmed", "Confirmé"
        ANNULE = "cancelled", "Annulé"
        TERMINE = "completed", "Terminé"
        ABSENT = "no_show", "Patient absent"

    #: Statuts qui occupent encore l'agenda du praticien (pas « annulé »).
    STATUTS_ACTIFS = ("pending", "confirmed", "completed", "no_show")

    #: Transitions autorisées (machine à états explicite).
    TRANSITIONS: dict[str, tuple[str, ...]] = {
        Statut.PENDING: (Statut.CONFIRMED, Statut.ANNULE, Statut.ABSENT),
        Statut.CONFIRMED: (Statut.TERMINE, Statut.ANNULE, Statut.ABSENT),
        Statut.ABSENT: (Statut.ANNULE,),
        Statut.TERMINE: (Statut.ANNULE,),
        Statut.ANNULE: (),
    }

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="rendez_vous",
        limit_choices_to={"role": "patient"},
        verbose_name="Patient",
    )
    praticien = models.ForeignKey(
        Practitioner,
        on_delete=models.PROTECT,
        related_name="rendez_vous",
        verbose_name="Praticien",
    )
    soin = models.ForeignKey(
        Soin,
        on_delete=models.PROTECT,
        related_name="rendez_vous",
        verbose_name="Soin",
    )
    debut = models.DateTimeField(verbose_name="Début", db_index=True)
    fin = models.DateTimeField(verbose_name="Fin")
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.PENDING,
        db_index=True,
        verbose_name="Statut",
    )
    prix_xof = models.PositiveIntegerField(
        validators=[MinValueValidator(0)],
        verbose_name="Prix (XOF)",
        help_text="Prix figé à la création du rendez-vous.",
    )
    notes = models.TextField(blank=True, default="", verbose_name="Notes")
    motif_annulation = models.TextField(
        blank=True, default="", verbose_name="Motif d'annulation"
    )
    confirme_le = models.DateTimeField(
        null=True, blank=True, verbose_name="Confirmé le"
    )
    annule_le = models.DateTimeField(null=True, blank=True, verbose_name="Annulé le")
    annule_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rendez_vous_annules",
        verbose_name="Annulé par",
    )

    #: `QuerySet.delete()` annule au lieu de supprimer.
    objects: models.Manager["Appointment"] = AppointmentQuerySet.as_manager()

    class Meta:
        verbose_name = "Rendez-vous"
        verbose_name_plural = "Rendez-vous"
        ordering = ("-debut",)
        indexes = [
            models.Index(fields=["praticien", "debut"], name="rdv_praticien_debut_idx"),
            models.Index(fields=["patient", "debut"], name="rdv_patient_debut_idx"),
            models.Index(fields=["statut", "debut"], name="rdv_statut_debut_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(fin__gt=F("debut")),
                name="rdv_fin_apres_debut",
            ),
            # Filet de sécurité portable (l'exclusion PostgreSQL complète).
            models.UniqueConstraint(
                fields=["praticien", "debut"],
                condition=~Q(statut="cancelled"),
                name="rdv_praticien_debut_unique_actif",
            ),
        ]

    # ------------------------------------------------------------------ helpers

    def __str__(self) -> str:
        return f"{self.patient} — {self.soin} ({self.debut:%d/%m/%Y %H:%M})"

    @property
    def patient_nom(self) -> str:
        return f"{self.patient.prenom} {self.patient.nom}"

    @property
    def praticien_nom(self) -> str:
        return str(self.praticien)

    @property
    def est_actif(self) -> bool:
        """Le rendez-vous occupe-t-il encore l'agenda du praticien ?"""
        return self.statut in self.STATUTS_ACTIFS

    @property
    def duree_minutes(self) -> int:
        return int((self.fin - self.debut).total_seconds() // 60)

    def peut_transitionner_vers(self, cible: str) -> bool:
        return cible in self.TRANSITIONS.get(self.statut, ())

    def prochain_statut(self) -> str | None:
        return (self.TRANSITIONS.get(self.statut) or (None,))[0]

    # ------------------------------------------------------------- validations

    def clean(self) -> None:
        """Contrôles de cohérence (complétés par `services.reserver`)."""
        erreurs: dict[str, str] = {}

        if self.debut and self.fin and self.fin <= self.debut:
            erreurs["fin"] = "La fin doit être après le début."
        if self.fin and self.debut:
            duree = (self.fin - self.debut).total_seconds() / 60
            if duree != int(duree):
                erreurs["fin"] = "La durée doit être exprimée en minutes entières."
        if self.patient_id and getattr(self.patient, "role", None) not in (
            None,
            "patient",
        ):
            erreurs["patient"] = "Le rendez-vous doit être rattaché à un patient."
        if self.statut == self.Statut.ANNULE and not self.motif_annulation:
            erreurs["motif_annulation"] = "Un motif d'annulation est obligatoire."
        if self.statut == self.Statut.ANNULE and self.annule_le is None:
            erreurs["annule_le"] = "La date d'annulation est obligatoire."

        if erreurs:
            raise ValidationError(erreurs)

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Horodate automatiquement les transitions de statut."""
        if self.statut == self.Statut.CONFIRMED and self.confirme_le is None:
            self.confirme_le = timezone.now()
        if self.statut == self.Statut.ANNULE and self.annule_le is None:
            self.annule_le = timezone.now()

        super().save(*args, **kwargs)

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        """Suppression physique interdite : on annule à la place.

        Django attend un couple ``(nb_lignes, {table: nb_lignes})`` ; on renvoie
        ``(0, {})`` puisque rien n'est réellement supprimé.
        """
        if self.pk is not None:
            from apps.appointments.services import annuler_rendez_vous

            annuler_rendez_vous(
                self,
                motif="Suppression demandée : rendez-vous annulé.",
                acteur=None,
                force=True,
            )
            self.pk = None
        return 0, {}
