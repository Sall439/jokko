from django.urls import URLPattern, URLResolver, include, path
from rest_framework.routers import DefaultRouter

from apps.catalog.views import CategorieSoinViewSet, SoinViewSet

router = DefaultRouter()
router.register("categories", CategorieSoinViewSet, basename="categorie-soin")
router.register("soins", SoinViewSet, basename="soin")

urlpatterns: list[URLPattern | URLResolver] = [
    path("", include(router.urls)),
]
