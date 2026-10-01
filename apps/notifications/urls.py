"""Routes de l'app `notifications` (montées sur `/api/v1/notifications/`)."""

from django.urls import URLPattern, URLResolver, include, path
from rest_framework.routers import DefaultRouter

from apps.notifications.views import NotificationViewSet

router = DefaultRouter()
router.register("", NotificationViewSet, basename="notification")

urlpatterns: list[URLPattern | URLResolver] = [
    path("", include(router.urls)),
]
