from django.contrib import admin
from django.db.models import QuerySet
from unfold.admin import ModelAdmin

from apps.appointments.models import Appointment
from apps.core.utils import as_business_local


@admin.register(Appointment)
class AppointmentAdmin(ModelAdmin):
    list_display = (
        "debut_local",
        "patient",
        "praticien",
        "soin",
        "statut",
        "prix_xof",
        "duree",
    )
    list_filter = ("statut", "soin__categorie", "praticien__cabinet")
    list_editable = ("statut",)
    search_fields = (
        "patient__nom",
        "patient__prenom",
        "patient__email",
        "praticien__user__nom",
        "soin__nom",
    )
    autocomplete_fields = ("patient", "praticien", "soin")
    date_hierarchy = "debut"
    ordering = ("-debut",)
    readonly_fields = (
        "fin",
        "prix_xof",
        "confirme_le",
        "annule_le",
        "annule_par",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Rendez-vous",
            {
                "fields": (
                    "patient",
                    "praticien",
                    "soin",
                    "debut",
                    "fin",
                    "statut",
                    "prix_xof",
                    "notes",
                )
            },
        ),
        ("Annulation", {"fields": ("motif_annulation", "annule_par", "annule_le")}),
        ("Traçabilité", {"fields": ("confirme_le", "created_at", "updated_at")}),
    )

    def has_delete_permission(self, request: object, obj: object = None) -> bool:
        """Suppression physique interdite : on annule depuis l'admin."""
        return False

    @admin.display(description="Début (heure locale)", ordering="debut")
    def debut_local(self, obj: Appointment) -> str:
        return as_business_local(obj.debut).strftime("%d/%m/%Y %H:%M")

    @admin.display(description="Durée")
    def duree(self, obj: Appointment) -> str:
        return f"{obj.duree_minutes} min"

    @admin.display(description="Statut", ordering="statut")
    def statut(self, obj: Appointment) -> str:
        return obj.get_statut_display()

    def get_queryset(self, request: object) -> QuerySet[Appointment]:
        return super().get_queryset(request).select_related(  # type: ignore[no-any-return]
            "patient", "praticien__user", "soin", "annule_par"
        )
