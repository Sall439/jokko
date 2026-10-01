from uuid import UUID

from django.db.models import Prefetch, QuerySet

from apps.catalog.models import Soin, SoinPraticien
from apps.practitioners.models import Practitioner


def get_practitioners(only_active: bool = True) -> QuerySet[Practitioner]:
    """Queryset optimisé (select_related + prefetch) des praticiens."""
    queryset = Practitioner.objects.select_related("user", "cabinet").prefetch_related(
        Prefetch(
            "soins_proposes",
            queryset=SoinPraticien.objects.select_related("soin").filter(actif=True),
            to_attr="soins_actifs",
        ),
        "specialites",
    )
    if only_active:
        queryset = queryset.filter(actif=True, user__is_active=True)
    return queryset.order_by("user__nom")


def get_practitioner_for_user(user_id: UUID | str | None) -> Practitioner | None:
    if user_id is None:
        return None
    return get_practitioners(only_active=False).filter(user_id=user_id).first()


def get_soins_proposes(praticien: Practitioner) -> QuerySet[Soin]:
    """Soins actifs proposés par le praticien."""
    return (
        Soin.objects.filter(
            par_praticiens__praticien=praticien,
            par_praticiens__actif=True,
            actif=True,
        )
        .distinct()
        .order_by("nom")
    )
