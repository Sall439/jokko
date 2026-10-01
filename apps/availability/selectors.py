from django.db.models import QuerySet

from apps.availability.models import ExceptionDisponibilite, HoraireHebdomadaire
from apps.practitioners.models import Practitioner


def get_horaires(
    praticien: Practitioner | None = None,
) -> QuerySet[HoraireHebdomadaire]:
    queryset = HoraireHebdomadaire.objects.select_related(
        "praticien", "praticien__user"
    )
    if praticien is not None:
        queryset = queryset.filter(praticien=praticien)
    return queryset.order_by("praticien_id", "jour", "heure_debut")


def get_exceptions(
    praticien: Practitioner | None = None,
) -> QuerySet[ExceptionDisponibilite]:
    queryset = ExceptionDisponibilite.objects.select_related(
        "praticien", "praticien__user"
    )
    if praticien is not None:
        queryset = queryset.filter(praticien=praticien)
    return queryset.order_by("praticien_id", "date", "heure_debut")
