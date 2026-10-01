from django.urls import URLPattern, URLResolver, include, path
from rest_framework.routers import DefaultRouter

from apps.appointments.views import AppointmentViewSet

router = DefaultRouter()
router.register("", AppointmentViewSet, basename="rendez-vous")

urlpatterns: list[URLPattern | URLResolver] = [
    path("", include(router.urls)),
]
