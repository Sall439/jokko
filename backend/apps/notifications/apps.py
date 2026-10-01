from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    verbose_name = "Notifications"

    def ready(self) -> None:
        """Connecte les signaux (import sûr, aucune dépendance circulaire)."""
        from apps.notifications import signals  # noqa: F401
