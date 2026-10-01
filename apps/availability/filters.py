import django_filters

from apps.availability.models import ExceptionDisponibilite, HoraireHebdomadaire
from apps.core.filters import BaseFilterSet


class HoraireHebdomadaireFilter(BaseFilterSet):
    search_fields = ("praticien__user__nom", "praticien__user__prenom")

    ordering = ("jour", "heure_debut", "heure_fin")

    class Meta:
        model = HoraireHebdomadaire
        fields = ["praticien", "jour", "actif"]


class ExceptionDisponibiliteFilter(BaseFilterSet):
    search_fields = ("motif", "praticien__user__nom")

    ordering = ("date", "-date")

    date_min = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_max = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = ExceptionDisponibilite
        fields = ["praticien", "type"]
