"""Permissions de l'app `notifications`.

    * ``patient`` : ne lit que **ses** notifications ;
    * ``dentiste`` : les notifications liées à ses rendez-vous (patient
      destinataire) sont visibles — l'agenda reste consultable autrement ;
    * ``admin`` : accès complet.
"""

from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.core.permissions import is_admin, is_practitioner


class CanReadNotification(BasePermission):
    """Lecture restreinte par rôle ; marquage « lue » pour le propriétaire."""

    message = "Cette notification ne vous concerne pas."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        user = request.user
        if is_admin(user):
            return True
        if getattr(obj, "destinataire_id", None) == user.id:
            return True
        rdv = getattr(obj, "rendez_vous", None)
        if rdv is not None and is_practitioner(user):
            return bool(rdv.praticien.user_id == user.id)
        return False
