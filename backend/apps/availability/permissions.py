"""Permissions de l'app `availability`.

Lecture : tout utilisateur authentifié (les patients ont besoin de consulter
les horaires pour réserver).

Écriture : l'administration sur tous les horaires / exceptions, un praticien
sur **les siens** uniquement.
"""

from typing import Any

from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.core.permissions import is_admin, is_practitioner


def _own_praticien(obj: Any, user: Any) -> bool:
    """`obj` possède-t-il un praticien appartenant à `user` ?"""
    praticien = getattr(obj, "praticien", None)
    return praticien is not None and praticien.user_id == user.id


class CanReadAvailability(BasePermission):
    """Lecture ouverte aux authentifiés, écriture au propriétaire ou à l'admin."""

    message = "Vous ne pouvez modifier que vos propres disponibilités."

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return is_admin(request.user) or is_practitioner(request.user)

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        if request.method in SAFE_METHODS or is_admin(request.user):
            return True
        return is_practitioner(request.user) and _own_praticien(obj, request.user)
