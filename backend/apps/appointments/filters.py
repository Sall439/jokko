from django_filters import rest_framework as filters

from apps.appointments.models import Appointment
from apps.core.filters import BaseFilterSet


class AppointmentFilter(BaseFilterSet):
    search_fields = (
        "patient__nom",
        "patient__prenom",
        "patient__email",
        "soin__nom",
        "praticien__user__nom",
        "praticien__user__prenom",
    )

    ordering = ("-debut", "debut", "-cree_le", "prix_xof")

    date_min = filters.DateFilter(field_name="debut__date", lookup_expr="gte")
    date_max = filters.DateFilter(field_name="debut__date", lookup_expr="lte")

    class Meta:
        model = Appointment
        fields = ["statut", "patient", "praticien", "soin"]
