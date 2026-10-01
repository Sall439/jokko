from typing import Any

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.catalog.filters import CategorieSoinFilter, SoinFilter
from apps.catalog.models import Soin
from apps.catalog.selectors import get_categories, get_soins
from apps.catalog.serializers import (
    CategorieSoinSerializer,
    SoinDetailSerializer,
    SoinListSerializer,
)
from apps.catalog.services import activer_soin, desactiver_soin
from apps.core.permissions import IsAdminRole, IsReadOnlyOrStaff

S_TAG = "Catalogue"


@extend_schema(tags=[S_TAG])
class CategorieSoinViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,  # type: ignore[type-arg]
):
    """Catégories de soins (écriture réservée à l'administration)."""

    queryset = get_categories()
    serializer_class = CategorieSoinSerializer
    permission_classes = [IsReadOnlyOrStaff]
    filterset_class = CategorieSoinFilter
    ordering = ("ordre", "nom")

    def get_permissions(self) -> list[Any]:
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAdminRole()]
        return list(super().get_permissions())


@extend_schema(tags=[S_TAG])
class SoinViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,  # type: ignore[type-arg]
):
    """Soins/actes dentaires du catalogue."""

    queryset = get_soins()
    permission_classes = [IsReadOnlyOrStaff]
    filterset_class = SoinFilter
    ordering = ("nom",)

    def get_permissions(self) -> list[Any]:
        if self.action in {"create", "update", "partial_update"}:
            return [IsAdminRole()]
        return list(super().get_permissions())

    def get_serializer_class(self) -> type[Any]:
        if self.action == "list":
            return SoinListSerializer
        return SoinDetailSerializer

    @extend_schema(
        summary="Créer / mettre à jour",
        responses={201: SoinDetailSerializer, 200: SoinDetailSerializer},
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().create(request, *args, **kwargs)

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Un soin référencé par des RDV n'est pas supprimable : on le désactive."""
        soin = self.get_object()
        desactiver_soin(soin)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="activer")
    @extend_schema(
        summary="Réactiver un soin",
        request=None,
        responses={200: SoinDetailSerializer},
    )
    def activer(self, request: Request, pk: str | None = None) -> Response:
        soin = get_object_or_404(Soin, pk=pk)
        activer_soin(soin)
        return Response(SoinDetailSerializer(soin).data)

    @action(detail=True, methods=["post"], url_path="desactiver")
    @extend_schema(
        summary="Désactiver un soin",
        request=None,
        responses={
            200: SoinDetailSerializer,
            404: OpenApiResponse(description="Soin introuvable."),
        },
    )
    def desactiver(self, request: Request, pk: str | None = None) -> Response:
        soin = get_object_or_404(Soin, pk=pk)
        desactiver_soin(soin)
        return Response(SoinDetailSerializer(soin).data)
