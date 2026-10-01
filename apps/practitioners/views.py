from typing import Any

from django.db.models import Count
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from apps.catalog.models import Soin
from apps.catalog.serializers import SoinListSerializer
from apps.core.permissions import IsAdminRole
from apps.practitioners.filters import (
    CabinetFilter,
    PractitionerFilter,
    SpecialiteFilter,
)
from apps.practitioners.models import Cabinet, Practitioner, Specialite
from apps.practitioners.permissions import CanReadPractitioners
from apps.practitioners.selectors import (
    get_practitioner_for_user,
    get_practitioners,
    get_soins_proposes,
)
from apps.practitioners.serializers import (
    CabinetSerializer,
    PractitionerDetailSerializer,
    PractitionerListSerializer,
    PractitionerWriteSerializer,
    SoinProposeSerializer,
    SpecialiteSerializer,
)
from apps.practitioners.services import proposer_soin, retirer_soin

S_TAG = "Praticiens"


def _parse_prix_xof(value: Any) -> int | None:
    """Accepte `null`, `""` ou un entier ; leve une erreur DRF sinon."""
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            {"prix_xof": ["Prix invalide (entier attendu, en XOF)."]}
        ) from exc


@extend_schema(tags=[S_TAG])
class SpecialiteViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    queryset = Specialite.objects.all().order_by("nom")
    serializer_class = SpecialiteSerializer
    permission_classes = [CanReadPractitioners]
    filterset_class = SpecialiteFilter
    ordering = ("nom",)
    pagination_class = None

    def get_permissions(self) -> list[Any]:
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAdminRole()]
        return list(super().get_permissions())


@extend_schema(tags=[S_TAG])
class CabinetViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    queryset = Cabinet.objects.annotate(nb_praticiens=Count("praticiens")).order_by(
        "nom"
    )
    serializer_class = CabinetSerializer
    permission_classes = [CanReadPractitioners]
    filterset_class = CabinetFilter
    ordering = ("nom", "ville")
    pagination_class = None

    def get_permissions(self) -> list[Any]:
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAdminRole()]
        return list(super().get_permissions())


@extend_schema(tags=[S_TAG])
class PractitionerViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    """Profils praticiens."""

    queryset = get_practitioners(only_active=False)
    permission_classes = [CanReadPractitioners]
    filterset_class = PractitionerFilter
    ordering = ("user__nom",)

    def get_serializer_class(self) -> type[Any]:
        if self.action == "list":
            return PractitionerListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return PractitionerWriteSerializer
        return PractitionerDetailSerializer

    def get_permissions(self) -> list[Any]:
        if self.action in {"create", "destroy"}:
            return [IsAdminRole()]
        return list(super().get_permissions())

    def perform_destroy(self, instance: Practitioner) -> None:
        if instance.rendez_vous.exists():
            raise ValidationError(
                {
                    "detail": "Ce praticien a des rendez-vous : "
                    "désactivez-le au lieu de le supprimer."
                },
                code="resource_in_use",
            )
        instance.delete()

    @action(detail=False, methods=["get"], url_path="moi")
    @extend_schema(
        summary="Profil du praticien connecte",
        description="Retourne le profil rattache a l'utilisateur authentifie.",
        responses={200: PractitionerDetailSerializer},
    )
    def moi(self, request: Request) -> Response:
        user = request.user
        profil = get_practitioner_for_user(user.id)
        if profil is None:
            raise ValidationError(
                {"detail": "Aucun profil praticien ne vous est rattaché."},
                code="practitioner_profile_missing",
            )
        return Response(PractitionerDetailSerializer(profil).data)

    @action(detail=True, methods=["get"], url_path="soins")
    @extend_schema(
        summary="Soins proposes par ce praticien",
        responses={200: SoinListSerializer(many=True)},
    )
    def soins(self, request: Request, pk: str | None = None) -> Response:
        profil = get_object_or_404(Practitioner, pk=pk)
        soins = get_soins_proposes(profil)
        return Response(SoinListSerializer(soins, many=True).data)

    @action(detail=True, methods=["get", "post", "delete"], url_path="soins-proposes")
    @extend_schema(
        summary="Gerer les soins proposes par le praticien",
        description=(
            "Liste les soins proposes ; POST ajoute un soin, DELETE le retire. "
            "Reserve au praticien lui-meme ou a l'administration."
        ),
        responses={200: SoinProposeSerializer(many=True)},
    )
    def soins_proposes(self, request: Request, pk: str | None = None) -> Response:
        """Liste / ajoute / retire un soin proposé."""
        profil = get_object_or_404(Practitioner, pk=pk)
        user = request.user
        if not (getattr(user, "role", None) == "admin" or profil.user_id == user.id):
            raise PermissionDenied(
                "Vous ne pouvez gérer que vos propres soins proposés."
            )

        donnees = request.data if isinstance(request.data, dict) else {}
        if request.method == "POST":
            soin = get_object_or_404(Soin, pk=donnees.get("soin"))
            proposer_soin(profil, soin, _parse_prix_xof(donnees.get("prix_xof")))
        elif request.method == "DELETE":
            soin = get_object_or_404(Soin, pk=donnees.get("soin"))
            retirer_soin(profil, soin)

        liens = profil.soins_proposes.select_related("soin").filter(actif=True)
        return Response(SoinProposeSerializer(liens, many=True).data)
