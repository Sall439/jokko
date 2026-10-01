from django.conf import settings
from django.contrib import admin
from django.urls import URLPattern, URLResolver, include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.core.views import health_check

urlpatterns: list[URLPattern | URLResolver] = [
    path("health", health_check, name="health-check"),
    path(settings.ADMIN_URL, admin.site.urls),
    # Auth & utilisateurs (API v1)
    path("api/", include("apps.accounts.urls")),
    # Ressources métier (API v1)
    path("api/v1/catalog/", include("apps.catalog.urls")),
    path("api/v1/practitioners/", include("apps.practitioners.urls")),
    path("api/v1/availability/", include("apps.availability.urls")),
    path("api/v1/appointments/", include("apps.appointments.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
