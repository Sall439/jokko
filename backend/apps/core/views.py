"""Vues transverses (santé de l'application)."""

from django.db import connection
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@extend_schema(
    summary="Sonde de santé",
    description="Vérifie la connectivité à la base de données. Public.",
    responses={
        200: {"type": "object", "properties": {"status": {"type": "string"}}},
        503: {"type": "object", "properties": {"status": {"type": "string"}}},
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request: Request) -> Response | JsonResponse:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok"})
    except Exception:
        return JsonResponse({"status": "error"}, status=503)
