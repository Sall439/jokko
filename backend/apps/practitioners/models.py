"""Profils praticiens : liés à un `User`, avec spécialités, soins et cabinet."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.catalog.models import Soin
from apps.core.models import BaseModel


class Specialite(BaseModel):
    """Spécialité dentaire (ex. « Endodontie », « Pédodontie »)."""

    nom = models.CharField(max_length=120, unique=True, verbose_name="Nom")
    description = models.TextField(blank=True, default="", verbose_name="Description")

    class Meta:
        verbose_name = "Spécialité"
        verbose_name_plural = "Spécialités"
        ordering = ("nom",)

    def __str__(self) -> str:
        return self.nom


class Cabinet(BaseModel):
    """Lieu d'exercice (adresse du cabinet)."""

    nom = models.CharField(max_length=150, verbose_name="Nom du cabinet")
    adresse = models.TextField(verbose_name="Adresse")
    telephone = models.CharField(
        max_length=20, blank=True, default="", verbose_name="Téléphone"
    )
    ville = models.CharField(max_length=80, default="Dakar", verbose_name="Ville")
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
        verbose_name="Latitude",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
        verbose_name="Longitude",
    )
    actif = models.BooleanField(default=True, db_index=True, verbose_name="Actif")

    class Meta:
        verbose_name = "Cabinet"
        verbose_name_plural = "Cabinets"
        ordering = ("nom",)

    def __str__(self) -> str:
        return f"{self.nom} — {self.ville}"


class Practitioner(BaseModel):
    """Profil professionnel rattaché à un utilisateur de rôle ``dentiste``."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="praticien",
        verbose_name="Utilisateur",
        limit_choices_to={"role": "dentiste"},
    )
    cabinet = models.ForeignKey(
        Cabinet,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="praticiens",
        verbose_name="Cabinet",
    )
    specialites = models.ManyToManyField(
        Specialite, blank=True, related_name="praticiens", verbose_name="Spécialités"
    )
    biographie = models.TextField(blank=True, default="", verbose_name="Biographie")
    annees_experience = models.PositiveIntegerField(
        default=0,
        validators=[MaxValueValidator(80)],
        verbose_name="Années d'expérience",
    )
    numero_ordre = models.CharField(
        max_length=50, blank=True, default="", verbose_name="Numéro d'ordre"
    )
    actif = models.BooleanField(default=True, db_index=True, verbose_name="Actif")

    class Meta:
        verbose_name = "Praticien"
        verbose_name_plural = "Praticiens"
        ordering = ("user__nom",)
        indexes = [
            models.Index(fields=["actif", "user"], name="praticien_actif_user_idx"),
        ]

    def __str__(self) -> str:
        return f"Dr {self.user.prenom} {self.user.nom}"

    def clean(self) -> None:
        if self.user_id and self.user.role != "dentiste":
            raise ValidationError(
                {
                    "user": "Seul un utilisateur avec le rôle « dentiste » "
                    "peut être rattaché à un profil praticien."
                }
            )

    @property
    def nom(self) -> str:
        return self.user.nom

    @property
    def prenom(self) -> str:
        return self.user.prenom

    def propose(self, soin: Soin) -> bool:
        """Le praticien propose-t-il ce soin (et est-il actif) ?"""
        if not self.actif:
            return False
        return self.soins_proposes.filter(soin=soin, actif=True).exists()
