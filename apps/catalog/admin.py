from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.catalog.models import CategorieSoin, Soin


@admin.register(CategorieSoin)
class CategorieSoinAdmin(ModelAdmin):
    list_display = ("nom", "ordre", "nb_soins")
    list_filter = ()
    search_fields = ("nom", "description")
    ordering = ("ordre", "nom")

    @admin.display(description="Nb soins")
    def nb_soins(self, obj: CategorieSoin) -> int:
        return obj.soins.count()


@admin.register(Soin)
class SoinAdmin(ModelAdmin):
    list_display = ("nom", "categorie", "duree_minutes", "prix_xof", "actif")
    list_filter = ("actif", "categorie")
    search_fields = ("nom", "description", "categorie__nom")
    ordering = ("nom",)
    list_editable = ("actif",)
    readonly_fields = ("created_at", "updated_at")
