from django.urls import URLPattern, URLResolver, include, path
from rest_framework.routers import DefaultRouter

from apps.practitioners.views import (
    CabinetViewSet,
    PractitionerViewSet,
    SpecialiteViewSet,
)

router = DefaultRouter()
router.register("specialites", SpecialiteViewSet, basename="specialite")
router.register("cabinets", CabinetViewSet, basename="cabinet")
router.register("", PractitionerViewSet, basename="praticien")

urlpatterns: list[URLPattern | URLResolver] = [
    path("", include(router.urls)),
]
