"""Endpoints de l'app `availability`.

* `GET/POST /api/v1/availability/horaires/` : horaires hebdomadaires
* `GET/POST /api/v1/availability/exceptions/` : congés / fermetures
* `GET /api/v1/availability/creneaux/` : créneaux réservables calculés
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.availability.filters import (
    ExceptionDisponibiliteFilter,
    HoraireHebdomadaireFilter,
)
from apps.availability.permissions import CanReadAvailability
from apps.availability.selectors import get_exceptions, get_horaires
from apps.availability.serializers import (
    CreneauQuerySerializer,
    CreneauSerializer,
    ExceptionDisponibiliteSerializer,
    HoraireHebdomadaireSerializer,
)
from apps.availability.services import formater_creneau, liste_creneaux

S_TAG = "Disponibilités"


@extend_schema(tags=[S_TAG])
class HoraireHebdomadaireViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    """Horaires hebdomadaires récurrents des praticiens.

    Lecture ouverte à tous les authentifiés ; écriture par l'administration
    ou par le praticien concerné.
    """

    queryset = get_horaires()
    serializer_class = HoraireHebdomadaireSerializer
    permission_classes = [CanReadAvailability]
    filterset_class = HoraireHebdomadaireFilter
    pagination_class = None
    ordering = ("jour", "heure_debut")


@extend_schema(tags=[S_TAG])
class ExceptionDisponibiliteViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    """Exceptions ponctuelles : congés, fermetures, RDV professionnels."""

    queryset = get_exceptions()
    serializer_class = ExceptionDisponibiliteSerializer
    permission_classes = [CanReadAvailability]
    filterset_class = ExceptionDisponibiliteFilter
    pagination_class = None
    ordering = ("date",)


class CreneauxView(APIView):
    """Créneaux réservables d'un praticien pour un soin donné.

    Les créneaux ne sont pas stockés : ils sont dérivés des horaires
    hebdomadaires, des exceptions et des rendez-vous déjà pris.
    """

    permission_classes = [CanReadAvailability]

    @extend_schema(
        tags=[S_TAG],
        summary="Lister les créneaux disponibles",
        description=(
            "Renvoie les créneaux réservables (durée = durée du soin) pour un "
            "praticien et un soin, entre deux dates locales. Sont exclus les "
            "créneaux passés, hors délai minimum / horizon de réservation, ou "
            "en conflit avec un congé ou un rendez-vous existant."
        ),
        parameters=[
            OpenApiParameter(
                "praticien", str, required=True, description="UUID du praticien."
            ),
            OpenApiParameter("soin", str, required=True, description="UUID du soin."),
            OpenApiParameter(
                "date_debut", str, description="Date locale (YYYY-MM-DD)."
            ),
            OpenApiParameter("date_fin", str, description="Date locale (YYYY-MM-DD)."),
        ],
        responses={200: CreneauSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        query = CreneauQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data

        creneaux = liste_creneaux(
            params["praticien"],
            params["soin"],
            params["date_debut"],
            params["date_fin"],
        )
        payload = [formater_creneau(creneau) for creneau in creneaux]
        return Response(CreneauSerializer(payload, many=True).data)
