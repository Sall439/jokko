from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.availability.models import ExceptionDisponibilite, HoraireHebdomadaire


@admin.register(HoraireHebdomadaire)
class HoraireHebdomadaireAdmin(ModelAdmin):
    list_display = ("praticien", "jour", "plage", "actif")
    list_filter = ("jour", "actif", "praticien__cabinet")
    list_editable = ("actif",)
    search_fields = (
        "praticien__user__nom",
        "praticien__user__prenom",
        "praticien__user__email",
    )
    autocomplete_fields = ("praticien",)
    ordering = ("praticien__user__nom", "jour", "heure_debut")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Créneau",
            {"fields": ("praticien", "jour", "heure_debut", "heure_fin", "actif")},
        ),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Plage horaire")
    def plage(self, obj: HoraireHebdomadaire) -> str:
        return str(obj)


@admin.register(ExceptionDisponibilite)
class ExceptionDisponibiliteAdmin(ModelAdmin):
    list_display = ("praticien", "date", "type", "plage", "motif")
    list_filter = ("type", "praticien__cabinet")
    search_fields = ("praticien__user__nom", "praticien__user__prenom", "motif")
    autocomplete_fields = ("praticien",)
    date_hierarchy = "date"
    ordering = ("-date", "heure_debut")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Exception",
            {
                "fields": (
                    "praticien",
                    "date",
                    "type",
                    "heure_debut",
                    "heure_fin",
                    "motif",
                )
            },
        ),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Plage")
    def plage(self, obj: ExceptionDisponibilite) -> str:
        return "journée entière" if obj.bloque_toute_la_journee else str(obj)
