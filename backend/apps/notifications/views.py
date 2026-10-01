"""Endpoints de l'app `notifications`.

    * `GET /api/v1/notifications/` : liste filtrée par rôle
    * `GET /api/v1/notifications/<id>/` : détail
    * `POST /api/v1/notifications/<id>/marquer-lue/` : marque la notification lue
"""

from typing import Any

from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.permissions import is_admin
from apps.notifications.filters import NotificationFilter
from apps.notifications.permissions import CanReadNotification
from apps.notifications.selectors import get_notifications
from apps.notifications.serializers import NotificationSerializer
from apps.notifications.services import notifications_visibles

S_TAG = "Notifications"


@extend_schema(tags=[S_TAG])
class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,  # type: ignore[type-arg]
):
    """Notifications, filtrées par rôle (le patient voit les siennes)."""

    queryset = get_notifications()
    serializer_class = NotificationSerializer
    permission_classes = [CanReadNotification]
    filterset_class = NotificationFilter
    ordering = ("-created_at",)

    def get_queryset(self) -> Any:
        user = getattr(self.request, "user", None)
        if user is None or not user.is_authenticated:
            return self.queryset.none()
        return notifications_visibles(user)

    @action(detail=True, methods=["post"], url_path="marquer-lue")
    @extend_schema(
        summary="Marquer une notification comme lue",
        request=None,
        responses={200: NotificationSerializer},
    )
    def marquer_lue(self, request: Request, pk: str | None = None) -> Response:
        notification = self.get_object()
        if not (
            is_admin(request.user)
            or notification.destinataire_id == request.user.id
        ):
            self.permission_denied(request)
        notification.lue = True
        notification.save(update_fields=["lue", "updated_at"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="marquer-toutes-lues")
    @extend_schema(
        summary="Marquer toutes les notifications de l'utilisateur comme lues",
        request=None,
        responses={200: None},
    )
    def marquer_toutes_lues(self, request: Request) -> Response:
        self.get_queryset().filter(destinataire=request.user, lue=False).update(
            lue=True
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
