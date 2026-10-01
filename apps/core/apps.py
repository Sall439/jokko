from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"

    def ready(self) -> None:
        # Enregistre l'extension OpenAPI du cookie JWT (schéma `/api/schema/`).
        from config import schema  # noqa: F401
