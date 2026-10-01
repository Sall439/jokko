"""Serializers de l'app `availability`."""

from datetime import time, timedelta
from typing import Any

from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from apps.availability.models import ExceptionDisponibilite, HoraireHebdomadaire
from apps.availability.selectors import get_horaires
from apps.catalog.models import Soin
from apps.core.permissions import is_admin
from apps.core.utils import local_date, now
from apps.practitioners.models import Practitioner


def _as_time(value: Any) -> time | None:
    if isinstance(value, time):
        return value
    if isinstance(value, str):
        return time.fromisoformat(value)
    return None


def _valider_propriete(self: Any, praticien: Any) -> None:
    """Un praticien ne peut écrire que ses propres disponibilités."""
    if praticien is None:
        return
    request = self.context.get("request")
    user = getattr(request, "user", None)
    if user is None or not user.is_authenticated:
        return
    if is_admin(user):
        return
    if praticien.user_id != user.id:
        raise PermissionDenied(
            "Vous ne pouvez modifier que vos propres disponibilités."
        )


class HoraireHebdomadaireSerializer(serializers.ModelSerializer[HoraireHebdomadaire]):
    praticien_nom = serializers.CharField(source="praticien.__str__", read_only=True)
    jour_libelle = serializers.CharField(source="get_jour_display", read_only=True)
    plage = serializers.SerializerMethodField()

    class Meta:
        model = HoraireHebdomadaire
        fields = (
            "id",
            "praticien",
            "praticien_nom",
            "jour",
            "jour_libelle",
            "heure_debut",
            "heure_fin",
            "plage",
            "actif",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "praticien_nom",
            "jour_libelle",
            "plage",
            "created_at",
            "updated_at",
        )

    def get_plage(self, obj: HoraireHebdomadaire) -> str:
        return f"{obj.heure_debut:%H:%M}-{obj.heure_fin:%H:%M}"

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        instance = self.instance
        debut = _as_time(
            attrs.get("heure_debut", getattr(instance, "heure_debut", None))
        )
        fin = _as_time(attrs.get("heure_fin", getattr(instance, "heure_fin", None)))
        if debut is None or fin is None:
            raise serializers.ValidationError(
                "Les heures de début et de fin sont obligatoires."
            )
        if fin <= debut:
            raise serializers.ValidationError(
                {"heure_fin": ["L'heure de fin doit être après l'heure de début."]}
            )

        jour = attrs.get("jour", getattr(instance, "jour", None))
        praticien = attrs.get("praticien", getattr(instance, "praticien", None))
        if jour is None or praticien is None:
            raise serializers.ValidationError(
                {"praticien": ["Le praticien et le jour sont obligatoires."]}
            )
        _valider_propriete(self, praticien)

        conflictants = [
            horaire
            for horaire in get_horaires(praticien).filter(jour=jour, actif=True)
            if horaire.pk != getattr(instance, "pk", None)
            and horaire.heure_debut < fin
            and debut < horaire.heure_fin
        ]
        if conflictants:
            raise serializers.ValidationError(
                {
                    "heure_debut": [
                        f"Ce créneau chevauche un horaire existant : {conflictants[0]}."
                    ]
                }
            )
        return attrs


class ExceptionDisponibiliteSerializer(
    serializers.ModelSerializer[ExceptionDisponibilite]
):
    praticien_nom = serializers.CharField(source="praticien.__str__", read_only=True)
    type_libelle = serializers.CharField(source="get_type_display", read_only=True)
    journee_entiere = serializers.BooleanField(
        source="bloque_toute_la_journee", read_only=True
    )

    class Meta:
        model = ExceptionDisponibilite
        fields = (
            "id",
            "praticien",
            "praticien_nom",
            "date",
            "type",
            "type_libelle",
            "heure_debut",
            "heure_fin",
            "journee_entiere",
            "motif",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "praticien_nom",
            "type_libelle",
            "journee_entiere",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        instance = self.instance
        _valider_propriete(
            self, attrs.get("praticien", getattr(instance, "praticien", None))
        )
        debut = _as_time(
            attrs.get("heure_debut", getattr(instance, "heure_debut", None))
        )
        fin = _as_time(attrs.get("heure_fin", getattr(instance, "heure_fin", None)))

        if (debut is None) != (fin is None):
            raise serializers.ValidationError(
                {
                    "heure_debut": [
                        "Renseignez les deux heures, ou aucune des deux "
                        "pour bloquer la journée entière."
                    ]
                }
            )
        if debut is not None and fin is not None and fin <= debut:
            raise serializers.ValidationError(
                {"heure_fin": ["L'heure de fin doit être après l'heure de début."]}
            )
        return attrs


class CreneauSerializer(serializers.Serializer[Any]):
    """Payload d'un créneau renvoyé par l'endpoint `/creneaux/`."""

    debut = serializers.DateTimeField()
    fin = serializers.DateTimeField()
    debut_local = serializers.DateTimeField()
    duree_minutes = serializers.IntegerField()


class CreneauQuerySerializer(serializers.Serializer[Any]):
    """Validation des paramètres de l'endpoint `/creneaux/`."""

    praticien = serializers.PrimaryKeyRelatedField(
        queryset=Practitioner.objects.filter(actif=True)
    )
    soin = serializers.PrimaryKeyRelatedField(queryset=Soin.objects.all())
    date_debut = serializers.DateField(required=False)
    date_fin = serializers.DateField(required=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        aujourdhui = local_date(now())
        debut = attrs.get("date_debut") or aujourdhui
        fin = attrs.get("date_fin") or (debut + timedelta(days=6))
        if debut < aujourdhui:
            raise serializers.ValidationError(
                {"date_debut": ["La date de début ne peut pas être dans le passé."]}
            )
        if fin < debut:
            raise serializers.ValidationError(
                {
                    "date_fin": [
                        "La date de fin doit être postérieure à la date de début."
                    ]
                }
            )
        if (fin - debut).days > 60:
            raise serializers.ValidationError(
                {"date_fin": ["La période demandée ne peut pas dépasser 60 jours."]}
            )
        attrs["date_debut"] = debut
        attrs["date_fin"] = fin
        return attrs
