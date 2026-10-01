from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from apps.catalog.models import CategorieSoin, Soin


class CategorieSoinSerializer(serializers.ModelSerializer[CategorieSoin]):
    """Catégorie de soin.

    Les champs sont déclarés explicitement pour produire des messages
    d'erreur **français** et cohérents (les validateurs générés depuis le
    modèle s'expriment en anglais par défaut). `nom` reste unique.
    """

    nom = serializers.CharField(
        max_length=120,
        error_messages={"blank": "Le nom de la catégorie est obligatoire."},
        validators=[
            UniqueValidator(
                queryset=CategorieSoin.objects.all(),
                message="Une catégorie portant ce nom existe déjà.",
            )
        ],
    )

    class Meta:
        model = CategorieSoin
        fields = ("id", "nom", "description", "ordre", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class SoinListSerializer(serializers.ModelSerializer[Soin]):
    categorie = serializers.CharField(source="categorie.nom", read_only=True)

    class Meta:
        model = Soin
        fields = ("id", "nom", "duree_minutes", "prix_xof", "categorie", "actif")
        read_only_fields = fields


class SoinDetailSerializer(serializers.ModelSerializer[Soin]):
    """Soin du catalogue (lecture + écriture pour l'administration).

    Les bornes de durée et de prix sont reprises du modèle mais avec des
    messages en français : les validateurs de modèle, convertis par DRF,
    parleraient anglais et masqueraient `validate_<champ>`.
    """

    categorie_nom = serializers.CharField(source="categorie.nom", read_only=True)
    nom = serializers.CharField(
        max_length=150,
        error_messages={"blank": "Le nom du soin est obligatoire."},
    )
    duree_minutes = serializers.IntegerField(
        min_value=5,
        max_value=600,
        error_messages={
            "min_value": "La durée doit être d'au moins 5 minutes.",
            "max_value": "La durée ne peut pas dépasser 600 minutes.",
        },
    )
    prix_xof = serializers.IntegerField(
        min_value=0,
        error_messages={"min_value": "Le prix ne peut pas être négatif."},
    )

    class Meta:
        model = Soin
        fields = (
            "id",
            "nom",
            "description",
            "duree_minutes",
            "prix_xof",
            "categorie",
            "categorie_nom",
            "actif",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
