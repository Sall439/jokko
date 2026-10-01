"""Permissions de l'app `practitioners`.

Regles :
    * lecture : tout utilisateur authentifie ;
    * ecriture : l'administration sur tous les profils, un praticien sur
      **le sien** uniquement ;
    * creation / suppression d'un profil : administration uniquement
      (impose dans les viewsets via ``get_permissions``).
"""

from typing import Any

from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.core.permissions import is_admin, is_practitioner
from apps.practitioners.models import Practitioner


class CanReadPractitioners(BasePermission):
    """Lecture ouverte aux authentifies, ecriture limitee au proprietaire."""

    message = "Vous ne pouvez modifier que votre propre profil de praticien."

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return is_admin(request.user) or is_practitioner(request.user)

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        if request.method in SAFE_METHODS or is_admin(request.user):
            return True
        return (
            is_practitioner(request.user)
            and isinstance(obj, Practitioner)
            and obj.user_id == request.user.id
        )
