import uuid

from django.db import models


class UUIDModel(models.Model):
    """Clé primaire UUID (opaques pour le client, pas d'énumération)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """Horodatage de création / mise à jour."""

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """Socle commun : UUID + timestamps."""

    class Meta:
        abstract = True
