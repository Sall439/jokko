"""Administration des notifications."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = (
        "sujet",
        "type",
        "canal",
        "destinataire",
        "statut",
        "envoi_le",
        "created_at",
    )
    list_filter = ("type", "canal", "statut", "lue")
    search_fields = (
        "sujet",
        "message",
        "destinataire__nom",
        "destinataire__prenom",
        "destinataire__email",
    )
    readonly_fields = (
        "destinataire",
        "rendez_vous",
        "type",
        "canal",
        "sujet",
        "message",
        "statut",
        "envoi_le",
        "erreur",
        "created_at",
        "updated_at",
    )
    autocomplete_fields = ("destinataire",)
    ordering = ("-created_at",)

    def has_add_permission(self, request: object) -> bool:
        return False

    def has_change_permission(self, request: object, obj: object = None) -> bool:
        return False

    def has_delete_permission(self, request: object, obj: object = None) -> bool:
        return False
