"""Catalogue des soins/actes dentaires.

Le prix est exprimé en **XOF** (entier, jamais de float) et la durée en minutes
c'est la durée du rendez-vous (utilisée par `availability` et `appointments`).
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from apps.core.models import BaseModel


class CategorieSoin(BaseModel):
    """Catégorie d'un soin (ex. « Prévention », « Chirurgie »)."""

    nom = models.CharField(max_length=120, unique=True, verbose_name="Nom")
    description = models.TextField(blank=True, default="", verbose_name="Description")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")

    class Meta:
        verbose_name = "Catégorie de soin"
        verbose_name_plural = "Catégories de soins"
        ordering = ("ordre", "nom")

    def __str__(self) -> str:
        return self.nom


class Soin(BaseModel):
    """Un acte dentaire proposé par le cabinet."""

    nom = models.CharField(max_length=150, verbose_name="Nom du soin")
    description = models.TextField(blank=True, default="", verbose_name="Description")
    duree_minutes = models.PositiveIntegerField(
        default=30,
        validators=[MinValueValidator(5), MaxValueValidator(600)],
        verbose_name="Durée (minutes)",
        help_text="Durée du rendez-vous, en minutes.",
    )
    prix_xof = models.PositiveIntegerField(
        validators=[MinValueValidator(0)],
        verbose_name="Prix (XOF)",
        help_text="Montant en francs CFA (entier, jamais de flottant).",
    )
    categorie = models.ForeignKey(
        CategorieSoin,
        on_delete=models.PROTECT,
        related_name="soins",
        verbose_name="Catégorie",
    )
    actif = models.BooleanField(default=True, db_index=True, verbose_name="Actif")

    class Meta:
        verbose_name = "Soin"
        verbose_name_plural = "Soins"
        ordering = ("nom",)
        indexes = [
            models.Index(fields=["actif", "nom"], name="soin_actif_nom_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(prix_xof__gte=0),
                name="soin_prix_xof_positif",
            ),
            models.CheckConstraint(
                condition=Q(duree_minutes__gte=5),
                name="soin_duree_minimum_5",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nom} ({self.duree_minutes} min - {self.prix_xof} XOF)"

    @property
    def creneau_fin(self) -> str:
        """Durée formatée pour l'affichage."""
        heures, minutes = divmod(self.duree_minutes, 60)
        if heures and minutes:
            return f"{heures}h{minutes:02d}"
        if heures:
            return f"{heures}h"
        return f"{minutes} min"


class SoinPraticien(BaseModel):
    """Soin proposé par un praticien (le prix peut différer du catalogue)."""

    praticien = models.ForeignKey(
        "practitioners.Practitioner",
        on_delete=models.CASCADE,
        related_name="soins_proposes",
        verbose_name="Praticien",
    )
    soin = models.ForeignKey(
        Soin,
        on_delete=models.CASCADE,
        related_name="par_praticiens",
        verbose_name="Soin",
    )
    prix_xof = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Prix spécifique (XOF)",
        help_text="Laissez vide pour utiliser le prix du catalogue.",
    )
    actif = models.BooleanField(default=True, verbose_name="Actif")

    class Meta:
        verbose_name = "Soin proposé"
        verbose_name_plural = "Soins proposés"
        ordering = ("soin__nom",)
        constraints = [
            models.UniqueConstraint(
                fields=["praticien", "soin"],
                name="unique_soin_par_praticien",
            )
        ]

    def __str__(self) -> str:
        return f"{self.praticien} — {self.soin.nom}"

    @property
    def tarif_effectif(self) -> int:
        """Prix applicable : spécifique s'il est défini, sinon celui du catalogue."""
        return self.prix_xof if self.prix_xof is not None else self.soin.prix_xof
