"""Tests de la documentation OpenAPI (`/api/schema/`, `/api/docs/`)."""

import pytest
from django.test import Client
from django.urls import reverse

from apps.accounts.tests.factories import AdminFactory

pytestmark = pytest.mark.django_db


def test_schema_est_servi_en_yaml(client: Client) -> None:
    response = client.get(reverse("schema"))
    assert response.status_code == 200
    assert response["Content-Type"].startswith("application/vnd.oai.openapi")

    corps = response.content.decode("utf-8")
    assert "openapi: 3" in corps
    # Les endpoints métier et ceux de l'app `accounts` sont tous documentés.
    for chemin in (
        "/api/auth/login:",
        "/api/v1/catalog/soins/:",
        "/api/v1/practitioners/:",
        "/api/v1/availability/horaires/:",
        "/api/v1/appointments/:",
        "/api/v1/notifications/:",
    ):
        assert chemin in corps, f"{chemin} absent du schéma"


def test_schema_documente_le_cookie_jwt(client: Client) -> None:
    """Sans l'extension OpenAPI du cookie JWT, aucun cadenas ne serait affiché."""
    from django.conf import settings

    corps = client.get(reverse("schema")).content.decode("utf-8")
    assert "cookieJwtAuth:" in corps
    assert "in: cookie" in corps
    # Le nom du cookie vient bien du réglage (aucune valeur en dur).
    assert f"name: {settings.JWT_AUTH_COOKIE}" in corps


def test_schema_documente_les_endpoints_accounts(client: Client) -> None:
    """L'app `accounts` n'étant pas annotable, un hook complète le schéma."""
    corps = client.get(reverse("schema")).content.decode("utf-8")
    assert "operationId: auth_login" in corps
    assert "operationId: utilisateurs_lister" in corps


def test_enums_de_statuts_ont_un_nom_lisible(client: Client) -> None:
    corps = client.get(reverse("schema")).content.decode("utf-8")
    assert "AppointmentStatutEnum:" in corps
    assert "NotificationTypeEnum:" in corps
    # Sans ENUM_NAME_OVERRIDES, drf-spectacular produit « Statut237Enum ».
    assert "Statut237Enum" not in corps


def test_docs_swagger_sont_servies(client: Client) -> None:
    reponse = client.get(reverse("swagger-ui"))
    assert reponse.status_code == 200
    assert "text/html" in reponse["Content-Type"]


def test_schema_ignore_un_administrateur_non_identifie(client: Client) -> None:
    """La documentation reste accessible : ni l'un ni l'autre ne dépend d'un rôle."""
    anonyme = client.get(reverse("schema")).status_code
    client.force_login(AdminFactory())
    assert client.get(reverse("schema")).status_code == anonyme == 200
