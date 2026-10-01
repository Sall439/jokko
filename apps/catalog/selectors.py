from django.db.models import QuerySet

from apps.catalog.models import CategorieSoin, Soin


def get_soins(only_active: bool = False) -> QuerySet[Soin]:
    return (
        Soin.objects.select_related("categorie").filter(actif=True).order_by("nom")
        if only_active
        else Soin.objects.select_related("categorie").order_by("nom")
    )


def get_categories() -> QuerySet[CategorieSoin]:
    return CategorieSoin.objects.order_by("ordre", "nom")
