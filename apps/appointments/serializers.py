"""Serializers de l'app `appointments`.

Séparation lecture / écriture :

    * `AppointmentListSerializer`   : liste paginée (champs dénormalisés) ;
    * `AppointmentDetailSerializer` : détail + statut + actions possibles ;
    * `AppointmentWriteSerializer`  : création (réservation) et mise à jour
      partielle des seuls champs éditables.

La réservation passe par `apps.appointments.services.reserver` : le serializer
ne fait que valider le payload et convertir les `ValidationError` du service
en 400.
"""

from typing import Any

from rest_framework import serializers

from apps.appointments.models import Appointment
from apps.appointments.services import reserver
from apps.catalog.models import Soin
from apps.core.utils import as_business_local, ensure_aware
from apps.practitioners.models import Practitioner

STATUT_LABELS = dict(Appointment.Statut.choices)


class AppointmentListSerializer(serializers.ModelSerializer[Appointment]):
    patient_nom = serializers.CharField(read_only=True)
    praticien_nom = serializers.CharField(read_only=True)
    soin_nom = serializers.CharField(source="soin.nom", read_only=True)
    categorie_nom = serializers.CharField(source="soin.categorie.nom", read_only=True)
    statut_libelle = serializers.CharField(source="get_statut_display", read_only=True)
    debut_local = serializers.SerializerMethodField()
    duree_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Appointment
        fields: tuple[str, ...] = (
            "id",
            "patient",
            "patient_nom",
            "praticien",
            "praticien_nom",
            "soin",
            "soin_nom",
            "categorie_nom",
            "debut",
            "fin",
            "debut_local",
            "duree_minutes",
            "statut",
            "statut_libelle",
            "prix_xof",
        )
        read_only_fields = fields

    def get_debut_local(self, obj: Appointment) -> str:
        return as_business_local(obj.debut).isoformat()


class AppointmentDetailSerializer(AppointmentListSerializer):
    motif_annulation = serializers.CharField(read_only=True)
    annule_par_nom = serializers.SerializerMethodField()
    annule_le = serializers.DateTimeField(read_only=True)
    confirme_le = serializers.DateTimeField(read_only=True)
    notes = serializers.CharField(read_only=True)
    transitions_possibles = serializers.SerializerMethodField()
    peut_annuler = serializers.SerializerMethodField()

    class Meta(AppointmentListSerializer.Meta):
        fields = AppointmentListSerializer.Meta.fields + (
            "notes",
            "motif_annulation",
            "annule_par",
            "annule_par_nom",
            "annule_le",
            "confirme_le",
            "est_actif",
            "transitions_possibles",
            "peut_annuler",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_annule_par_nom(self, obj: Appointment) -> str | None:
        if obj.annule_par_id is None:
            return None
        auteur = obj.annule_par
        if auteur is None:  # pragma: no cover - garde-fou de typage
            return None
        return f"{auteur.prenom} {auteur.nom}"

    def get_transitions_possibles(self, obj: Appointment) -> list[str]:
        return list(Appointment.TRANSITIONS.get(obj.statut, ()))

    def get_peut_annuler(self, obj: Appointment) -> bool:
        """L'annulation est-elle encore possible (fenêtre de 24 h) ?"""
        from apps.appointments.services import peut_annuler

        return peut_annuler(obj)


class AppointmentWriteSerializer(serializers.Serializer[Any]):
    """Payload de réservation d'un rendez-vous."""

    praticien = serializers.PrimaryKeyRelatedField(
        queryset=Practitioner.objects.filter(actif=True)
    )
    soin = serializers.PrimaryKeyRelatedField(queryset=Soin.objects.all())
    debut = serializers.DateTimeField()
    notes = serializers.CharField(
        required=False, allow_blank=True, default="", max_length=2000
    )

    def validate_debut(self, value: Any) -> Any:
        debut = ensure_aware(value)
        if debut.tzinfo is None:  # pragma: no cover - `ensure_aware` le garantit
            raise serializers.ValidationError("Date invalide : fuseau requis.")
        return debut

    def create(self, validated_data: dict[str, Any]) -> Appointment:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            raise serializers.ValidationError(
                {"detail": "Authentification requise."}, code="not_authenticated"
            )
        return reserver(
            patient=user,
            praticien=validated_data["praticien"],
            soin=validated_data["soin"],
            debut=validated_data["debut"],
            notes=validated_data.get("notes", ""),
        )


class AppointmentPatchSerializer(serializers.Serializer[Any]):
    """Mise à jour partielle : uniquement les notes (état = machine à états)."""

    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def update(
        self, instance: Appointment, validated_data: dict[str, Any]
    ) -> Appointment:
        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        instance.save(update_fields=["notes", "updated_at"])
        return instance


class AnnulationSerializer(serializers.Serializer[Any]):
    """Motif d'annulation (obligatoire, conservé avec le rendez-vous)."""

    motif = serializers.CharField(max_length=2000)


class AppointmentStatutSerializer(serializers.Serializer[Any]):
    """Marque le patient absent."""

    motif = serializers.CharField(required=False, allow_blank=True, default="")
