from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.catalog.models import SoinPraticien
from apps.practitioners.models import Cabinet, Practitioner, Specialite


class SoinProposeInline(admin.TabularInline):  # type: ignore[type-arg]
    model = SoinPraticien
    extra = 1
    autocomplete_fields = ("soin",)
    verbose_name_plural = "Soins proposés"


@admin.register(Specialite)
class SpecialiteAdmin(ModelAdmin):
    list_display = ("nom",)
    search_fields = ("nom", "description")
    ordering = ("nom",)


@admin.register(Cabinet)
class CabinetAdmin(ModelAdmin):
    list_display = ("nom", "ville", "telephone", "actif", "nb_praticiens")
    list_filter = ("actif", "ville")
    search_fields = ("nom", "adresse", "ville", "telephone")
    ordering = ("nom",)

    @admin.display(description="Nb praticiens")
    def nb_praticiens(self, obj: Cabinet) -> int:
        return obj.praticiens.count()


@admin.register(Practitioner)
class PractitionerAdmin(ModelAdmin):
    list_display = ("__str__", "cabinet", "telephone", "actif", "nb_soins")
    list_filter = ("actif", "cabinet", "specialites")
    search_fields = ("user__nom", "user__prenom", "user__email", "numero_ordre")
    ordering = ("user__nom",)
    autocomplete_fields = ("user",)
    filter_horizontal = ("specialites",)
    inlines = (SoinProposeInline,)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Identité",
            {"fields": ("user", "cabinet", "specialites", "numero_ordre")},
        ),
        ("Profil", {"fields": ("biographie", "annees_experience", "actif")}),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Téléphone")
    def telephone(self, obj: Practitioner) -> str:
        return obj.user.telephone

    @admin.display(description="Nb soins")
    def nb_soins(self, obj: Practitioner) -> int:
        return obj.soins_proposes.filter(actif=True).count()
