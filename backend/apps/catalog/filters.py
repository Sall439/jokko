from apps.catalog.models import CategorieSoin, Soin
from apps.core.filters import BaseFilterSet


class SoinFilter(BaseFilterSet):
    search_fields = ("nom", "description", "categorie__nom")

    ordering = ("nom", "prix_xof", "duree_minutes", "created_at")

    class Meta:
        model = Soin
        fields = ["actif", "categorie"]


class CategorieSoinFilter(BaseFilterSet):
    search_fields = ("nom", "description")

    ordering = ("ordre", "nom")

    class Meta:
        model = CategorieSoin
        fields: list[str] = []
