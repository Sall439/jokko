"""Gestion des erreurs HTTP.

Format de réponse unifié pour toute l'API :

.. code-block:: json

    {"code": "validation_error", "message": "...", "fields": {"champ": ["..."]}}
"""

from typing import Any

from rest_framework.views import exception_handler


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Any:
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "code": getattr(exc, "default_code", "error"),
            "message": "Une erreur est survenue.",
        }

        if isinstance(response.data, dict):
            if any(isinstance(v, (list, dict)) for v in response.data.values()):
                error_data["code"] = "validation_error"
                error_data["message"] = "Erreur de validation des données."
                error_data["fields"] = response.data
            else:
                detail = response.data.get("detail")
                if detail:
                    error_data["message"] = str(detail)
        elif isinstance(response.data, list):
            error_data["message"] = " ".join([str(item) for item in response.data])

        response.data = error_data

    return response
