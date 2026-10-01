"""Permissions de l'app `appointments`.

    * `patient`  : ne voit et ne modifie que **ses** rendez-vous ;
    * `dentiste` : ne voit que les rendez-vous de **son** agenda ;
    * `admin`    : accès complet.

La restriction par objet est appliquée en base (`rendez_vous_visibles`) *et*
en permission objet, pour rester sûre même si un queryset custom est fourni.
"""

from typing import Any

from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.core.permissions import is_admin


def _concerns_user(rdv: Appointment, user: Any) -> bool:
    """Le rendez-vous concerne-t-il cet utilisateur (patient ou praticien) ?"""
    if is_admin(user):
        return True
    if rdv.patient_id == user.id:
        return True
    return bool(rdv.praticien.user_id == user.id)


class CanReadAppointment(BasePermission):
    """Un patient ne voit que ses RDV, un praticien que les siens, l'admin tous."""

    message = "Ce rendez-vous ne vous concerne pas."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        if not isinstance(obj, Appointment):
            return False
        return _concerns_user(obj, request.user)


class IsPatientBooking(BasePermission):
    """Seul un patient peut réserver un rendez-vous — et pour lui-même.

    Le sérialiseur d'écriture déduit toujours le patient de l'utilisateur
    authentifié : sans cette permission, un praticien pourrait créer un
    rendez-vous « pour lui », ce qui n'a aucun sens métier. La saisie pour un
    tiers se fait depuis l'interface d'administration (mot de passe des
    praticiens / secrétariat).
    """

    message = "Seuls les patients réservent un rendez-vous."

    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return getattr(user, "role", None) == "patient"
