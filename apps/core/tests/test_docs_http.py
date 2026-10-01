"""Le fichier `docs/api.http` doit rester aligné sur l'API réellement servie.

Ce test échoue dès qu'un endpoint est ajouté, renommé ou retiré sans que la
collection HTTP soit mise à jour (et inversement). Règle retenue : chaque
opération `GET`, `POST`, `PATCH` et `DELETE` du schéma est documentée ; `PUT`
est considéré comme couvert par son équivalent `PATCH` (même charge utile,
champs obligatoires en plus), pour éviter de doubler la collection.
"""

import re
from pathlib import Path
from typing import Any

from django.test import Client
from django.urls import reverse

COLLECTION = Path(__file__).resolve().parents[3] / "docs" / "api.http"

#: `{{host}}`, `{{praticienId}}`, UUID littéraux… → le paramètre `{id}` du schéma.
_VARIABLE = re.compile(r"\{\{[^}]+\}\}")
_UUID = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)
#: Une ligne « VERBE URL » (les commentaires commencent par `###`).
_REQUETE = re.compile(r"^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s*$")

_VERBES = ("get", "post", "put", "patch", "delete")

#: Pages de documentation servies par Django, absentes du schéma OpenAPI.
_HORS_SCHEMA = frozenset({("GET", "/api/schema/"), ("GET", "/api/docs/")})


def _operations_du_schema(client: Client) -> set[tuple[str, str]]:
    """Opérations du schéma OpenAPI servi par `/api/schema/?format=json`."""
    reponse = client.get(f"{reverse('schema')}?format=json")
    assert reponse.status_code == 200
    chemins: dict[str, Any] = reponse.json()["paths"]
    return {
        (methode.upper(), chemin)
        for chemin, operations in chemins.items()
        for methode in operations
        if methode in _VERBES
    }


def _operations_documentees() -> set[tuple[str, str]]:
    """Opérations listées dans `docs/api.http`."""
    operations: set[tuple[str, str]] = set()
    for ligne in COLLECTION.read_text(encoding="utf-8").splitlines():
        trouve = _REQUETE.match(ligne)
        if trouve is None:
            continue
        methode, url = trouve.groups()
        chemin = url.removeprefix("{{host}}").split("?", 1)[0]
        chemin = _VARIABLE.sub("{id}", chemin)
        chemin = _UUID.sub("{id}", chemin)
        operations.add((methode, chemin))
    return operations


def test_la_collection_existe() -> None:
    assert COLLECTION.is_file(), "docs/api.http est introuvable"


def test_la_collection_couvre_tous_les_endpoints(client: Client) -> None:
    schema = _operations_du_schema(client)
    documentees = _operations_documentees()
    assert documentees, "aucune requête reconnue dans docs/api.http"

    # `PUT` est couvert par son équivalent `PATCH` sur le même chemin.
    put_par_patch = {
        ("PUT", chemin)
        for methode, chemin in schema
        if methode == "PUT" and ("PATCH", chemin) in documentees
    }
    manquantes = schema - documentees - put_par_patch
    assert not manquantes, f"endpoints non documentés : {sorted(manquantes)}"


def test_la_collection_ne_documente_pas_de_faux_endpoints(client: Client) -> None:
    schema = _operations_du_schema(client)
    inventes = _operations_documentees() - schema - _HORS_SCHEMA
    assert not inventes, (
        f"requêtes inexistantes dans docs/api.http : {sorted(inventes)}"
    )


def test_la_collection_documente_l_authentification() -> None:
    contenu = COLLECTION.read_text(encoding="utf-8")
    # Connexion, cookie JWT et CSRF doivent être documentés.
    for attendu in (
        "POST {{host}}/api/auth/login",
        "GET {{host}}/api/auth/csrf",
        "X-CSRFToken:",
        "Referer: {{host}}",
        "GET {{host}}/api/auth/me",
    ):
        assert attendu in contenu, f"{attendu} absent de docs/api.http"


def test_la_collection_couvre_les_erreurs_metier() -> None:
    """401 / 403 / 404 / 400 sont illustrés, pas seulement le cas nominal."""
    contenu = COLLECTION.read_text(encoding="utf-8").lower()
    for marqueur in (
        "### 401",
        "### 403",
        "### 404",
        "### 400",
    ):
        assert marqueur in contenu, f"{marqueur} absent de docs/api.http"
