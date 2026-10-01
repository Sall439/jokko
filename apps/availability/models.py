"""Disponibilites des praticiens : horaires hebdomadaires et exceptions.

Les creneaux libres ne sont **pas** stockes : ils sont calcules a la demande par
`apps.availability.services` en tenant compte :
    * des horaires hebdomadaires recurrents ;
    * des exceptions (conge, fermeture, RDV professionnel) ;
    * des rendez-vous deja pris (contrainte d'exclusion PostgreSQL) ;
    * de la duree du soin (voir `catalog.Soin.duree_minutes`) ;
    * du delai minimum de prise de rendez-vous et de l'horizon de reservation.
"""

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q

from apps.core.models import BaseModel
from apps.practitioners.models import Practitioner


class HoraireHebdomadaire(BaseModel):
    """Plage horaire recurrente : « chaque lundi, 09:00 - 13:00 »."""

    JOURS = (
        (0, "Lundi"),
        (1, "Mardi"),
        (2, "Mercredi"),
        (3, "Jeudi"),
        (4, "Vendredi"),
        (5, "Samedi"),
        (6, "Dimanche"),
    )

    praticien = models.ForeignKey(
        Practitioner,
        on_delete=models.CASCADE,
        related_name="horaires",
        verbose_name="Praticien",
    )
    jour = models.PositiveSmallIntegerField(
        choices=JOURS,
        validators=[MinValueValidator(0), MaxValueValidator(6)],
        verbose_name="Jour de la semaine",
        help_text="0 = lundi ... 6 = dimanche.",
    )
    heure_debut = models.TimeField(verbose_name="Heure de début")
    heure_fin = models.TimeField(verbose_name="Heure de fin")
    actif = models.BooleanField(default=True, db_index=True, verbose_name="Actif")

    class Meta:
        verbose_name = "Horaire hebdomadaire"
        verbose_name_plural = "Horaires hebdomadaires"
        ordering = ("jour", "heure_debut")
        indexes = [
            models.Index(
                fields=["praticien", "jour", "actif"],
                name="horaire_praticien_jour_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(heure_fin__gt=F("heure_debut")),
                name="horaire_fin_apres_debut",
            ),
            models.UniqueConstraint(
                fields=["praticien", "jour", "heure_debut"],
                name="unique_horaire_par_jour",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.get_jour_display()} "
            f"{self.heure_debut:%H:%M} - {self.heure_fin:%H:%M}"
        )

    def chevauche(self, autre: "HoraireHebdomadaire") -> bool:
        """Deux plages se chevauchent-elles (meme jour) ?"""
        return (
            self.jour == autre.jour
            and self.heure_debut < autre.heure_fin
            and autre.heure_debut < self.heure_fin
        )


class ExceptionDisponibilite(BaseModel):
    """Exception ponctuelle : conge, fermeture, RDV professionnel...

    Si `heure_debut`/`heure_fin` sont vides, toute la journee est bloquee.
    """

    TYPES = (
        ("conge", "Congé"),
        ("fermeture", "Fermeture"),
        ("rdv_professionnel", "Rendez-vous professionnel"),
        ("autre", "Autre"),
    )

    praticien = models.ForeignKey(
        Practitioner,
        on_delete=models.CASCADE,
        related_name="exceptions",
        verbose_name="Praticien",
    )
    date = models.DateField(verbose_name="Date")
    heure_debut = models.TimeField(
        null=True, blank=True, verbose_name="Heure de début (vide = toute la journée)"
    )
    heure_fin = models.TimeField(
        null=True, blank=True, verbose_name="Heure de fin (vide = toute la journée)"
    )
    type = models.CharField(
        max_length=30, choices=TYPES, default="conge", verbose_name="Type"
    )
    motif = models.TextField(blank=True, default="", verbose_name="Motif")

    class Meta:
        verbose_name = "Exception de disponibilité"
        verbose_name_plural = "Exceptions de disponibilité"
        ordering = ("date", "heure_debut")
        indexes = [
            models.Index(
                fields=["praticien", "date"], name="exception_praticien_date_idx"
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(heure_debut__isnull=True, heure_fin__isnull=True)
                    | Q(
                        heure_debut__isnull=False,
                        heure_fin__isnull=False,
                        heure_fin__gt=F("heure_debut"),
                    )
                ),
                name="exception_horaires_coherents",
            ),
        ]

    def __str__(self) -> str:
        plage = (
            "journée entière"
            if self.bloque_toute_la_journee
            else f"{self.heure_debut:%H:%M} - {self.heure_fin:%H:%M}"
        )
        return f"{self.date:%d/%m/%Y} - {self.get_type_display()} ({plage})"

    def clean(self) -> None:
        if (self.heure_debut is None) != (self.heure_fin is None):
            raise ValidationError(
                {
                    "heure_debut": "Renseignez les deux heures, ou aucune "
                    "des deux pour bloquer la journée entière."
                }
            )
        if (
            self.heure_debut is not None
            and self.heure_fin is not None
            and self.heure_fin <= self.heure_debut
        ):
            raise ValidationError(
                {"heure_fin": "L'heure de fin doit être après l'heure de début."}
            )

    @property
    def bloque_toute_la_journee(self) -> bool:
        return self.heure_debut is None or self.heure_fin is None
