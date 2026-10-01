from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.accounts.tests.factories import AdminFactory, PatientFactory
from apps.core.exceptions import custom_exception_handler
from apps.core.pagination import StandardPagination

User = get_user_model()  # type: ignore[misc, assignment]

pytestmark = pytest.mark.django_db


def _paginate(records: list[object]) -> dict[str, Any]:
    paginator = StandardPagination()
    request = Request(APIRequestFactory().get("/"))
    page = paginator.paginate_queryset(records, request)  # type: ignore[arg-type]
    assert page is not None
    return dict(paginator.get_paginated_response(page).data)


def test_standard_pagination_envelope() -> None:
    payload = _paginate(list(range(45)))
    assert payload["meta"]["page"] == 1
    assert payload["meta"]["pageSize"] == 20
    assert payload["meta"]["total"] == 45
    assert len(payload["data"]) == 20


def test_health_check(client: Client) -> None:
    url = reverse("health-check")
    response = client.get(url)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_error_envelope_on_validation_error(client: Client) -> None:
    PatientFactory(email="doublon@jokkodentiste.sn")
    response = client.post(
        reverse("auth-register"),
        {
            "email": "doublon@jokkodentiste.sn",
            "password": "MotdepasseSolide123",
            "nom": "Test",
            "prenom": "User",
        },
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["code"] == "validation_error"
    assert payload["message"] == "Erreur de validation des données."
    assert "email" in payload["fields"]


def test_error_envelope_on_not_found(client: Client) -> None:
    admin = AdminFactory()
    client.force_login(admin)

    response = client.get("/api/utilisateurs/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert response.json()["message"] == "Utilisateur non trouvé."

    # Un administrateur ne peut pas se supprimer lui-même (conflit métier).
    response = client.delete(f"/api/utilisateurs/{admin.id}")
    assert response.status_code == 409
    assert response.json()["code"] == "cannot_modify_self"


def test_error_envelope_on_permission_denied(client: Client) -> None:
    PatientFactory(email="patient.deny@jokkodentiste.sn")
    client.force_login(User.objects.get(email="patient.deny@jokkodentiste.sn"))
    response = client.get(reverse("user-list"))
    assert response.status_code == 403
    assert response.json()["code"] == "permission_denied"


def test_custom_exception_handler_ignores_non_api_exception() -> None:
    assert custom_exception_handler(ValueError("boom"), {}) is None


def test_custom_exception_handler_agrege_une_erreur_non_dict() -> None:
    """Une `ValidationError` sans dictionnaire de champs reste lisible.

    DRF renvoie alors une liste : l'enveloppe doit la recoller en un message
    unique au lieu de laisser `fields` vide.
    """
    from rest_framework.exceptions import ValidationError
    from rest_framework.response import Response
    from rest_framework.views import exception_handler

    reponse_brute = exception_handler(ValidationError(["Premier souci."]), {})
    assert reponse_brute is not None
    assert isinstance(reponse_brute, Response)

    reponse = custom_exception_handler(ValidationError(["Premier souci."]), {})
    assert reponse is not None
    assert reponse.data == {
        "code": "invalid",
        "message": "Premier souci.",
    }


def test_custom_exception_handler_lit_le_champ_detail() -> None:
    """`{"detail": "…"}` (erreur non liée à un champ) alimente le message."""
    from rest_framework.exceptions import APIException

    class ErreurGlobale(APIException):
        status_code = 400
        default_detail = "Opération impossible en l'état."

    reponse = custom_exception_handler(ErreurGlobale(), {})
    assert reponse is not None
    assert reponse.data["message"] == "Opération impossible en l'état."
    assert "fields" not in reponse.data
