"""Filtres de l'app `notifications` (django-filter)."""

from django_filters import rest_framework as filters

from apps.notifications.models import Notification


class NotificationFilter(filters.FilterSet):
    """Filtres : type, canal, statut, lecture, période."""

    type = filters.CharFilter(field_name="type", lookup_expr="exact")
    canal = filters.CharFilter(field_name="canal", lookup_expr="exact")
    statut = filters.CharFilter(field_name="statut", lookup_expr="exact")
    lue = filters.BooleanFilter(field_name="lue")
    date_min = filters.DateFilter(
        field_name="created_at", lookup_expr="date__gte"
    )
    date_max = filters.DateFilter(
        field_name="created_at", lookup_expr="date__lte"
    )

    class Meta:
        model = Notification
        fields = ("type", "canal", "statut", "lue")
