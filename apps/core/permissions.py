"""Permissions communes à toutes les apps.

Rôles (voir ``accounts.models.User.ROLE_CHOICES``) :
    * ``patient``  : ne voit que ses propres données ;
    * ``dentiste`` : ne voit que les rendez-vous qui le concernent ;
    * ``admin``    : accès complet (inclut le rôle « secrétaire »).

Note : ``apps.accounts.permissions.IsAdminRole`` existe déjà (app ``accounts``
non modifiée) ; la classe ci-dessous est la référence partagée par les autres
apps.
"""

from typing import Any

from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

ROLE_PATIENT = "patient"
ROLE_DENTISTE = "dentiste"
ROLE_ADMIN = "admin"

STAFF_ROLES: tuple[str, ...] = (ROLE_ADMIN, ROLE_DENTISTE)


def user_has_role(user: Any, *roles: str) -> bool:
    """Retourne ``True`` si l'utilisateur est authentifié et a l'un des rôles."""
    return bool(
        user is not None
        and getattr(user, "is_authenticated", False)
        and getattr(user, "role", None) in roles
    )


def is_admin(user: Any) -> bool:
    return user_has_role(user, ROLE_ADMIN)


def is_practitioner(user: Any) -> bool:
    return user_has_role(user, ROLE_DENTISTE)


def is_staff(user: Any) -> bool:
    return user_has_role(user, *STAFF_ROLES)


class IsAdminRole(BasePermission):
    """Réservé au rôle ``admin`` (et donc aux secrétaires)."""

    message = "Accès réservé aux administrateurs."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return is_admin(request.user)


class IsPractitionerRole(BasePermission):
    """Réservé au rôle ``dentiste``."""

    message = "Accès réservé aux praticiens."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return is_practitioner(request.user)


class IsStaffRole(BasePermission):
    """Rôles ``admin`` ou ``dentiste``."""

    message = "Accès réservé au personnel du cabinet."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return is_staff(request.user)


class IsReadOnlyOrStaff(BasePermission):
    """Lecture pour tout utilisateur authentifié, écriture pour le personnel."""

    message = "Modification réservée au personnel du cabinet."

    def has_permission(self, request: Request, view: APIView) -> bool:
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return is_staff(request.user)
