from typing import Any

import pytest
from rest_framework.permissions import SAFE_METHODS
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from apps.accounts.tests.factories import (
    AdminFactory,
    DentistFactory,
    PatientFactory,
)
from apps.core.permissions import (
    IsAdminRole,
    IsPractitionerRole,
    IsReadOnlyOrStaff,
    IsStaffRole,
    is_admin,
    is_practitioner,
    is_staff,
    user_has_role,
)

pytestmark = pytest.mark.django_db

factory = APIRequestFactory()


class _ProbeView(APIView):
    permission_classes: list[Any] = []

    def get(self, request: Request) -> Response:
        return Response({"ok": True})

    post = get


def _request(user: Any, method: str = "get") -> Request:
    """Requête DRF « nue » carrying un utilisateur (sans passer par la session)."""
    http_request = getattr(factory, method)("/")
    http_request.user = user  # type: ignore[attr-defined]
    http_request.method = method.upper()  # type: ignore[attr-defined]
    request = Request(http_request)
    request._user = user
    request._request.user = user
    return request


@pytest.mark.parametrize(
    "user_factory,admin,practitioner,staff",
    [
        (AdminFactory, True, False, True),
        (DentistFactory, False, True, True),
        (PatientFactory, False, False, False),
    ],
)
def test_role_helpers(
    user_factory: Any, admin: bool, practitioner: bool, staff: bool
) -> None:
    user = user_factory()
    assert user_has_role(user, user.role) is True
    assert user_has_role(user, "role-inexistant") is False
    assert is_admin(user) is admin
    assert is_practitioner(user) is practitioner
    assert is_staff(user) is staff


def test_user_has_role_handles_anonymous() -> None:
    from django.contrib.auth.models import AnonymousUser

    assert user_has_role(AnonymousUser(), "admin") is False
    assert user_has_role(None, "admin") is False


@pytest.mark.parametrize(
    "permission,allowed_roles",
    [
        (IsAdminRole, {"admin"}),
        (IsPractitionerRole, {"dentiste"}),
        (IsStaffRole, {"admin", "dentiste"}),
    ],
)
def test_role_permissions(permission: type, allowed_roles: set[str]) -> None:
    for role in ("admin", "dentiste", "patient"):
        user = PatientFactory(role=role)
        expected = role in allowed_roles
        assert permission().has_permission(_request(user), _ProbeView()) is expected


def test_is_readonly_or_staff() -> None:
    permission = IsReadOnlyOrStaff()
    patient = PatientFactory()
    dentist = DentistFactory()

    assert permission.has_permission(_request(patient, "get"), _ProbeView()) is True
    assert permission.has_permission(_request(patient, "post"), _ProbeView()) is False
    assert permission.has_permission(_request(dentist, "post"), _ProbeView()) is True
    assert "POST" not in SAFE_METHODS


def test_admin_permission_denies_anonymous() -> None:
    view = _ProbeView.as_view(permission_classes=[IsAdminRole])
    response = view(factory.get("/"))
    assert response.status_code == 401
