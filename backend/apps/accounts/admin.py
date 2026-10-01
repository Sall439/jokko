from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):  # type: ignore[type-arg]
    list_display = (
        "email",
        "nom",
        "prenom",
        "role",
        "is_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "nom", "prenom", "telephone")
    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Informations personnelles",
            {"fields": ("nom", "prenom", "telephone", "role")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Dates importantes", {"fields": ("date_joined", "last_login")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "nom",
                    "prenom",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
