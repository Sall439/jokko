from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.catalog.models import Soin, SoinPraticien
from apps.catalog.serializers import SoinListSerializer
from apps.practitioners.models import Cabinet, Practitioner, Specialite
from apps.practitioners.selectors import get_soins_proposes

#: Le modèle `User` réel : l'annotation statique n'expose pas ses managers.
User = get_user_model()


class SpecialiteSerializer(serializers.ModelSerializer[Specialite]):
    class Meta:
        model = Specialite
        fields = ("id", "nom", "description", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_nom(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError(
                "Le nom de la spécialité est obligatoire."
            )
        return cleaned


class CabinetSerializer(serializers.ModelSerializer[Cabinet]):
    nb_praticiens = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cabinet
        fields = (
            "id",
            "nom",
            "adresse",
            "telephone",
            "ville",
            "latitude",
            "longitude",
            "actif",
            "nb_praticiens",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "nb_praticiens")

    def validate_nom(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Le nom du cabinet est obligatoire.")
        return cleaned

    def validate_adresse(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("L'adresse est obligatoire.")
        return cleaned


class SoinProposeSerializer(serializers.ModelSerializer[SoinPraticien]):
    soin = SoinListSerializer(read_only=True)
    tarif_effectif = serializers.IntegerField(read_only=True)

    class Meta:
        model = SoinPraticien
        fields = ("id", "soin", "prix_xof", "tarif_effectif", "actif")
        read_only_fields = ("id", "soin", "tarif_effectif", "actif")


class SoinProposeWriteSerializer(serializers.Serializer[dict[str, Any]]):
    soin = serializers.PrimaryKeyRelatedField(queryset=Soin.objects.all())
    prix_xof = serializers.IntegerField(required=False, allow_null=True, min_value=0)


class PractitionerListSerializer(serializers.ModelSerializer[Practitioner]):
    nom = serializers.CharField(read_only=True)
    prenom = serializers.CharField(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    telephone = serializers.CharField(source="user.telephone", read_only=True)
    cabinet_nom = serializers.CharField(
        source="cabinet.nom", read_only=True, default=None
    )
    # Pas de « [Any] » ici : les generics PEP 585 sur les champs de relation DRF
    # exigent djangorestframework >= 3.15, alors que requirements/base.txt épingle
    # la 3.14.0. Les autres annotations (ModelSerializer[...], Serializer[...])
    # fonctionnent car elles héritent de Generic.
    specialites = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="nom"
    )

    class Meta:
        model = Practitioner
        fields = (
            "id",
            "nom",
            "prenom",
            "email",
            "telephone",
            "cabinet",
            "cabinet_nom",
            "specialites",
            "actif",
        )
        read_only_fields = fields


class PractitionerDetailSerializer(serializers.ModelSerializer[Practitioner]):
    nom = serializers.CharField(read_only=True)
    prenom = serializers.CharField(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    telephone = serializers.CharField(source="user.telephone", read_only=True)
    specialites = SpecialiteSerializer(many=True, read_only=True)
    soins = serializers.SerializerMethodField()

    class Meta:
        model = Practitioner
        fields = (
            "id",
            "nom",
            "prenom",
            "email",
            "telephone",
            "cabinet",
            "specialites",
            "biographie",
            "annees_experience",
            "numero_ordre",
            "soins",
            "actif",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "specialites",
            "soins",
            "created_at",
            "updated_at",
        )

    def get_soins(self, obj: Practitioner) -> Any:
        return SoinListSerializer(get_soins_proposes(obj), many=True).data

    def validate_annees_experience(self, value: int) -> int:
        if value > 80:
            raise serializers.ValidationError(
                "L'expérience ne peut pas dépasser 80 ans."
            )
        return value


class PractitionerWriteSerializer(serializers.ModelSerializer[Practitioner]):
    """Création d'un praticien : on part d'un `User` existant de rôle dentiste."""

    user = serializers.PrimaryKeyRelatedField(
        # Le champ du modèle porte `limit_choices_to={"role": "dentiste"}` :
        # sans queryset explicite, DRF renverrait « cet objet n'existe pas »
        # (message anglais) au lieu de la règle métier ci-dessous.
        queryset=User.objects.all(),
        error_messages={
            "required": "Renseignez l'utilisateur rattaché au praticien.",
            "does_not_exist": "Utilisateur introuvable.",
            "invalid": "L'identifiant de l'utilisateur est invalide.",
        },
    )

    class Meta:
        model = Practitioner
        fields = (
            "id",
            "user",
            "cabinet",
            "biographie",
            "annees_experience",
            "numero_ordre",
            "specialites",
            "actif",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_user(self, value: Any) -> Any:
        if value.role != "dentiste":
            raise serializers.ValidationError(
                "L'utilisateur doit avoir le rôle « dentiste »."
            )
        if Practitioner.objects.filter(user=value).exists():
            raise serializers.ValidationError(
                "Ce praticien est déjà rattaché à un profil existant."
            )
        return value
