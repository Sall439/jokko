from apps.core.filters import BaseFilterSet
from apps.practitioners.models import Cabinet, Practitioner, Specialite


class PractitionerFilter(BaseFilterSet):
    search_fields = ("user__nom", "user__prenom", "user__email", "biographie")

    ordering = ("user__nom", "user__prenom", "annees_experience", "created_at")

    class Meta:
        model = Practitioner
        fields = ["actif", "cabinet", "specialites"]


class SpecialiteFilter(BaseFilterSet):
    search_fields = ("nom", "description")

    ordering = ("nom",)

    class Meta:
        model = Specialite
        fields: list[str] = []


class CabinetFilter(BaseFilterSet):
    search_fields = ("nom", "adresse", "ville", "telephone")

    ordering = ("nom", "ville")

    class Meta:
        model = Cabinet
        fields = ["actif", "ville"]
