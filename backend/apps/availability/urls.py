from django.urls import URLPattern, URLResolver, include, path
from rest_framework.routers import DefaultRouter

from apps.availability.views import (
    CreneauxView,
    ExceptionDisponibiliteViewSet,
    HoraireHebdomadaireViewSet,
)

router = DefaultRouter()
router.register("horaires", HoraireHebdomadaireViewSet, basename="horaire")
router.register("exceptions", ExceptionDisponibiliteViewSet, basename="exception")

urlpatterns: list[URLPattern | URLResolver] = [
    path("creneaux/", CreneauxView.as_view(), name="creneaux"),
    path("", include(router.urls)),
]
