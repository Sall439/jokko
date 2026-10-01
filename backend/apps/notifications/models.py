"""Notifications : traçabilité des messages envoyés aux utilisateurs.

Chaque notification est un **enregistrement** (destinataire, type, canal,
sujet, message, statut) : on garde la trace de ce qui a été envoyé, quand et
avec quel résultat. La génération des notifications se fait **uniquement** par
signaux (`apps.notifications.signals`) déclenchés sur le cycle de vie des
rendez-vous — jamais dans les vues.
"""

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import BaseModel


class Notification(BaseModel):
    """Un message à destination d'un utilisateur (email, SMS, WhatsApp)."""

    class Type(models.TextChoices):
        RDV_CREE = (
            "appointment_created",
            "Demande de rendez-vous",
        )
        RDV_CONFIRME = "appointment_confirmed", "Rendez-vous confirmé"
        RDV_ANNULE = "appointment_cancelled", "Rendez-vous annulé"
        RDV_ABSENT = "appointment_no_show", "Patient absent"
        RAPPEL = "appointment_reminder", "Rappel de rendez-vous"

    class Canal(models.TextChoices):
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"
        WHATSAPP = "whatsapp", "WhatsApp"

    class Statut(models.TextChoices):
        EN_ATTENTE = "pending", "En attente"
        ENVOYEE = "sent", "Envoyée"
        ECHEC = "failed", "Échec"

    #: Types susceptibles d'être générés en masse par le rappel (idempotence).
    TYPES_RAPPEL = (Type.RAPPEL,)

    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Destinataire",
    )
    rendez_vous = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        verbose_name="Rendez-vous",
    )
    type = models.CharField(
        max_length=30,
        choices=Type.choices,
        db_index=True,
        verbose_name="Type",
    )
    canal = models.CharField(
        max_length=20,
        choices=Canal.choices,
        default=Canal.EMAIL,
        verbose_name="Canal",
    )
    sujet = models.CharField(max_length=255, verbose_name="Sujet")
    message = models.TextField(verbose_name="Message")
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_ATTENTE,
        db_index=True,
        verbose_name="Statut",
    )
    lue = models.BooleanField(default=False, db_index=True, verbose_name="Lue")
    envoi_le = models.DateTimeField(
        null=True, blank=True, verbose_name="Envoyée le"
    )
    erreur = models.TextField(blank=True, default="", verbose_name="Erreur")

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ("-created_at",)
        indexes = [
            models.Index(
                fields=["destinataire", "created_at"],
                name="notif_destinataire_date_idx",
            ),
            models.Index(fields=["statut", "created_at"], name="notif_statut_date_idx"),
        ]
        constraints = [
            # Une seule notification par (rendez-vous, type, canal) : rend la
            # génération des rappels idempotente et évite les doublons.
            models.UniqueConstraint(
                fields=["rendez_vous", "type", "canal"],
                condition=Q(rendez_vous__isnull=False),
                name="notif_unique_rdv_type_canal",
            )
        ]

    def __str__(self) -> str:
        return f"{self.get_type_display()} → {self.destinataire} ({self.sujet})"

    @property
    def destinataire_nom(self) -> str:
        return f"{self.destinataire.prenom} {self.destinataire.nom}"
