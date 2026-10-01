"""Complément au schéma OpenAPI (drf-spectacular).

L'app `accounts` (APIViews écrites avant l'adoption de drf-spectacular et
figées : on n'y touche pas) ne peut pas être annotée avec `@extend_schema`.
Ses endpoints apparaissent donc dans le schéma, mais **sans corps de requête
ni de réponse**. Ce fichier comble ce manque de deux façons :

1. `CookieJWTAuthenticationScheme` déclare le cookie JWT comme schéma de
   sécurité ; sans cela, drf-spectacular ignore l'authentification sur tous
   les endpoints et la documentation n'affiche aucun cadenas.
2. `documenter_endpoints_auth(result, …)`, branché via
   `SPECTACULAR_SETTINGS["POSTPROCESSING_HOOKS"]`, enrichit les opérations
   `/api/auth/*` et `/api/utilisateurs*` avec leurs charges utiles et des
   `operationId` stables (les deux `GET` d'`accounts` entrent sinon en
   collision de nom).

Les noms d'enums, eux, sont configurés dans
`config.settings.base.SPECTACULAR_SETTINGS` (`ENUM_NAME_OVERRIDES`).

Ce module est importé par `CoreConfig.ready()` pour enregistrer l'extension.
"""

from typing import Any

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.openapi import AutoSchema


class CookieJWTAuthenticationScheme(  # type: ignore[no-untyped-call]
    OpenApiAuthenticationExtension
):
    """JWT stocké en cookie httpOnly + session Django (CSRF sur l'écriture)."""

    target_class = "apps.accounts.authentication.CookieJWTAuthentication"
    name = "cookieJwtAuth"

    def get_security_definition(self, auto_schema: AutoSchema) -> dict[str, Any]:
        from django.conf import settings

        cookie = settings.JWT_AUTH_COOKIE
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": cookie,
            "description": (
                f"Jeton JWT stocké dans le cookie httpOnly `{cookie}` "
                "(renvoyé par `POST /api/auth/login`). Les requêtes "
                "d'écriture sont soumises au CSRF : envoyer l'en-tête "
                "`X-CSRFToken` avec la valeur du cookie `csrftoken`."
            ),
        }


# --------------------------------------------------------------------------- #
# Charges utiles des endpoints `accounts` (écrites à la main, voir module doc)
# --------------------------------------------------------------------------- #

_UTILISATEUR: dict[str, Any] = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "format": "uuid"},
        "nom": {"type": "string", "maxLength": 150},
        "prenom": {"type": "string", "maxLength": 150},
        "email": {"type": "string", "format": "email"},
        "telephone": {"type": "string", "maxLength": 20},
        "role": {"type": "string", "enum": ["patient", "dentiste", "admin"]},
    },
    "required": ["id", "nom", "prenom", "email", "role"],
}

_INSCRIPTION: dict[str, Any] = {
    "type": "object",
    "properties": {
        "email": {"type": "string", "format": "email"},
        "nom": {"type": "string", "maxLength": 150},
        "prenom": {"type": "string", "maxLength": 150},
        "telephone": {"type": "string", "maxLength": 20},
        "password": {"type": "string", "format": "password", "minLength": 8},
    },
    "required": ["email", "nom", "prenom", "password"],
}

_CONNEXION: dict[str, Any] = {
    "type": "object",
    "properties": {
        "email": {"type": "string", "format": "email"},
        "password": {"type": "string", "format": "password"},
    },
    "required": ["email", "password"],
}

_ERREUR: dict[str, Any] = {
    "type": "object",
    "properties": {
        "code": {"type": "string"},
        "message": {"type": "string"},
    },
    "required": ["code", "message"],
}

_DETAIL: dict[str, Any] = {
    "type": "object",
    "properties": {"detail": {"type": "string"}},
}

_PAGE_UTILISATEURS: dict[str, Any] = {
    "type": "object",
    "properties": {
        "data": {"type": "array", "items": _UTILISATEUR},
        "meta": {
            "type": "object",
            "properties": {
                "page": {"type": "integer"},
                "pageSize": {"type": "integer"},
                "total": {"type": "integer"},
            },
        },
    },
    "required": ["data"],
}


def _corps(schema: dict[str, Any]) -> dict[str, Any]:
    return {
        "required": True,
        "content": {"application/json": {"schema": schema}},
    }


def _reponse(schema: dict[str, Any], description: str) -> dict[str, Any]:
    return {
        "description": description,
        "content": {"application/json": {"schema": schema}},
    }


#: ``chemin`` -> {méthode: (operationId, résumé, corps de requête, réponses)}
_ENDPOINTS: dict[str, dict[str, Any]] = {
    "/api/auth/register": {
        "post": (
            "auth_register",
            "Créer un compte patient",
            _corps(_INSCRIPTION),
            {
                "201": _reponse(_UTILISATEUR, "Compte créé."),
                "400": _reponse(_ERREUR, "Données invalides ou email déjà utilisé."),
            },
        )
    },
    "/api/auth/login": {
        "post": (
            "auth_login",
            "Se connecter (cookies httpOnly)",
            _corps(_CONNEXION),
            {
                "200": _reponse(
                    _UTILISATEUR,
                    "Connecté : cookies d'accès et de rafraîchissement posés.",
                ),
                "400": _reponse(_ERREUR, "Identifiants invalides."),
            },
        )
    },
    "/api/auth/refresh": {
        "post": (
            "auth_refresh",
            "Rafraîchir le jeton d'accès",
            None,
            {
                "200": _reponse(_DETAIL, "Nouveau couple de cookies posé."),
                "401": _reponse(_ERREUR, "Jeton de rafraîchissement invalide."),
            },
        )
    },
    "/api/auth/logout": {
        "post": (
            "auth_logout",
            "Se déconnecter",
            None,
            {"200": _reponse(_DETAIL, "Cookies supprimés, jeton révoqué.")},
        )
    },
    "/api/auth/me": {
        "get": (
            "auth_me",
            "Profil de l'utilisateur connecté",
            None,
            {"200": _reponse(_UTILISATEUR, "Profil courant.")},
        )
    },
    "/api/utilisateurs": {
        "get": (
            "utilisateurs_lister",
            "Lister les utilisateurs (administration)",
            None,
            {"200": _reponse(_PAGE_UTILISATEURS, "Page d'utilisateurs.")},
        )
    },
    "/api/utilisateurs/{id}": {
        "get": (
            "utilisateurs_consulter",
            "Consulter un utilisateur (administration)",
            None,
            {
                "200": _reponse(_UTILISATEUR, "Utilisateur."),
                "404": _reponse(_ERREUR, "Utilisateur introuvable."),
            },
        ),
        "patch": (
            "utilisateurs_modifier",
            "Modifier un utilisateur (administration)",
            _corps(_UTILISATEUR),
            {
                "200": _reponse(_UTILISATEUR, "Utilisateur mis à jour."),
                "400": _reponse(_ERREUR, "Données invalides."),
            },
        ),
        "delete": (
            "utilisateurs_supprimer",
            "Supprimer un utilisateur (administration)",
            None,
            {
                "204": {"description": "Utilisateur supprimé."},
                "409": _reponse(
                    _ERREUR,
                    "Suppression impossible (ressource liée, ou soi-même).",
                ),
            },
        ),
    },
}


def documenter_endpoints_auth(
    result: dict[str, Any],
    generator: Any,
    request: Any,
    public: bool,
) -> dict[str, Any]:
    """Renseigne les corps de requête/réponse des endpoints `accounts`.

    `public=True` correspond au schéma complet (celui servi par `/api/schema/`) ;
    le schéma restreint n'est pas concerné.
    """
    if not public:
        return result

    chemins = result.get("paths", {})
    for chemin, operations in _ENDPOINTS.items():
        if chemin not in chemins:
            continue
        for methode, (operation_id, resume, corps, reponses) in operations.items():
            operation = chemins[chemin].get(methode)
            if operation is None:
                continue
            operation["operationId"] = operation_id
            operation["summary"] = resume
            if corps is not None:
                operation["requestBody"] = corps
            operation["responses"] = reponses

    return result
