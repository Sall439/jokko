"""Endpoints de l'app `appointments`.

    * `GET/POST /api/v1/appointments/` : liste filtrée par rôle / réservation
    * `GET/PATCH/DELETE /api/v1/appointments/<id>/` : détail, notes, annulation
    * `POST .../confirmer/`, `.../terminer/`, `.../absent/`, `.../annuler/`

`DELETE` **n'annule pas** le rendez-vous : la vue appelle le service
`annuler()` qui conserve statut + motif (aucune suppression physique).
"""

from typing import Any

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from apps.appointments import services
from apps.appointments.filters import AppointmentFilter
from apps.appointments.models import Appointment
from apps.appointments.permissions import CanReadAppointment, IsPatientBooking
from apps.appointments.selectors import get_avenir, get_rendez_vous
from apps.appointments.serializers import (
    AnnulationSerializer,
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    AppointmentPatchSerializer,
    AppointmentWriteSerializer,
)
from apps.appointments.services import rendez_vous_visibles
from apps.core.permissions import is_admin, is_practitioner

S_TAG = "Rendez-vous"

MOTIF_PAR_DEFAUT = "Annulation depuis l'API (motif non précisé)."


def _verifier_acteur_staff(request: Request, rendez_vous: Appointment) -> None:
    """Seul le praticien concerné ou l'administration peut changer le statut."""
    if is_admin(request.user):
        return
    if (
        is_practitioner(request.user)
        and rendez_vous.praticien.user_id == request.user.id
    ):
        return
    raise PermissionDenied(
        "Seul le praticien concerné ou un administrateur peut modifier le statut."
    )


@extend_schema(tags=[S_TAG])
class AppointmentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,  # type: ignore[type-arg]
):
    """Rendez-vous, filtrés par rôle (patient / praticien / admin)."""

    queryset = get_rendez_vous()
    permission_classes = [CanReadAppointment]
    filterset_class = AppointmentFilter
    ordering = ("-debut", "debut", "prix_xof")

    def get_queryset(self) -> Any:
        user = getattr(self.request, "user", None)
        if user is None or not user.is_authenticated:
            return self.queryset.none()
        return rendez_vous_visibles(user)

    def get_permissions(self) -> list[Any]:
        """La réservation est réservée aux patients (cf. `IsPatientBooking`)."""
        permissions: list[Any] = list(super().get_permissions())
        if self.action == "create":
            permissions.append(IsPatientBooking())
        return permissions

    def get_serializer_class(self) -> Any:
        if self.action == "list":
            return AppointmentListSerializer
        if self.action == "create":
            return AppointmentWriteSerializer
        if self.action in {"update", "partial_update"}:
            return AppointmentPatchSerializer
        return AppointmentDetailSerializer

    # ------------------------------------------------------------------ écriture

    @extend_schema(
        summary="Réserver un rendez-vous",
        description=(
            "Le créneau est revalidé côté service (horaires, congés, conflits, "
            "délai minimum, horizon) sous verrou `select_for_update`. "
            "La durée et le prix sont déduits du catalogue."
        ),
        request=AppointmentWriteSerializer,
        responses={
            201: AppointmentDetailSerializer,
            400: OpenApiResponse(description="Créneau non réservable."),
        },
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = AppointmentWriteSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        rendez_vous = serializer.save()
        return Response(
            AppointmentDetailSerializer(rendez_vous).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Mettre à jour les notes",
        request=AppointmentPatchSerializer,
        responses={200: AppointmentDetailSerializer},
    )
    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        rendez_vous = self.get_object()
        serializer = AppointmentPatchSerializer(
            instance=rendez_vous, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        rendez_vous = serializer.save()
        return Response(AppointmentDetailSerializer(rendez_vous).data)

    @extend_schema(
        summary="Annuler (et non supprimer) un rendez-vous",
        description=(
            "Le rendez-vous n'est jamais supprimé : son statut passe à "
            "`cancelled` et le motif est conservé. L'annulation par un patient "
            "est soumise à la fenêtre `APPOINTMENT_CANCELLATION_WINDOW_HOURS` ; "
            "l'administration passe outre."
        ),
        request=AnnulationSerializer,
        responses={
            200: AppointmentDetailSerializer,
            400: OpenApiResponse(description="Motif manquant ou hors fenêtre."),
        },
    )
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        rendez_vous = self.get_object()
        motif = (
            str(request.data.get("motif", "") or "")
            if isinstance(request.data, dict)
            else ""
        )
        services.annuler(
            rendez_vous,
            motif=motif.strip() or MOTIF_PAR_DEFAUT,
            acteur=request.user,
            force=is_admin(request.user),
        )
        return Response(AppointmentDetailSerializer(rendez_vous).data)

    # -------------------------------------------------------------------- actions

    @action(detail=True, methods=["post"], url_path="confirmer")
    @extend_schema(
        summary="Confirmer un rendez-vous",
        description="Réservé au praticien concerné ou à l'administration.",
        request=None,
        responses={200: AppointmentDetailSerializer},
    )
    def confirmer(self, request: Request, pk: str | None = None) -> Response:
        rendez_vous = self.get_object()
        _verifier_acteur_staff(request, rendez_vous)
        services.confirmer(rendez_vous, acteur=request.user)
        return Response(AppointmentDetailSerializer(rendez_vous).data)

    @action(detail=True, methods=["post"], url_path="terminer")
    @extend_schema(
        summary="Marquer un rendez-vous comme terminé",
        request=None,
        responses={200: AppointmentDetailSerializer},
    )
    def terminer(self, request: Request, pk: str | None = None) -> Response:
        rendez_vous = self.get_object()
        _verifier_acteur_staff(request, rendez_vous)
        services.terminer(rendez_vous, acteur=request.user)
        return Response(AppointmentDetailSerializer(rendez_vous).data)

    @action(detail=True, methods=["post"], url_path="absent")
    @extend_schema(
        summary="Marquer le patient comme absent",
        request=None,
        responses={200: AppointmentDetailSerializer},
    )
    def absent(self, request: Request, pk: str | None = None) -> Response:
        rendez_vous = self.get_object()
        _verifier_acteur_staff(request, rendez_vous)
        services.marquer_absent(rendez_vous, acteur=request.user)
        return Response(AppointmentDetailSerializer(rendez_vous).data)

    @action(detail=True, methods=["post"], url_path="annuler")
    @extend_schema(
        summary="Annuler un rendez-vous (motif conservé)",
        description=(
            "Un motif est obligatoire et conservé avec le rendez-vous. "
            "Un patient ne peut pas annuler moins de "
            "`APPOINTMENT_CANCELLATION_WINDOW_HOURS` avant le rendez-vous."
        ),
        request=AnnulationSerializer,
        responses={200: AppointmentDetailSerializer},
    )
    def annuler(self, request: Request, pk: str | None = None) -> Response:
        rendez_vous = self.get_object()
        serializer = AnnulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.annuler(
            rendez_vous,
            motif=serializer.validated_data["motif"],
            acteur=request.user,
            force=is_admin(request.user),
        )
        return Response(AppointmentDetailSerializer(rendez_vous).data)

    @action(detail=False, methods=["get"], url_path="avenir")
    @extend_schema(
        summary="Prochains rendez-vous de l'utilisateur connecté",
        responses={200: AppointmentListSerializer(many=True)},
    )
    def avenir(self, request: Request) -> Response:
        try:
            limite = min(max(int(request.query_params.get("limite", 5)), 1), 50)
        except (TypeError, ValueError):
            limite = 5
        return Response(
            AppointmentListSerializer(get_avenir(request.user, limite), many=True).data
        )
