from typing import Any

from django.db import transaction
from django.db.models import QuerySet
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Soin, SoinPraticien
from apps.practitioners.models import Practitioner


@transaction.atomic
def proposer_soin(
    praticien: Practitioner, soin: Soin, prix_xof: int | None = None
) -> SoinPraticien:
    """Associe un soin au praticien (idempotent)."""
    if prix_xof is not None and prix_xof < 0:
        raise ValidationError({"prix_xof": ["Le prix ne peut pas être négatif."]})
    lien, _ = SoinPraticien.objects.update_or_create(
        praticien=praticien,
        soin=soin,
        defaults={"prix_xof": prix_xof, "actif": True},
    )
    return lien


@transaction.atomic
def retirer_soin(praticien: Practitioner, soin: Soin) -> None:
    """Désactive le soin pour ce praticien (les RDV passés sont conservés)."""
    SoinPraticien.objects.filter(praticien=praticien, soin=soin).update(actif=False)


@transaction.atomic
def maj_soins_praticien(
    praticien: Practitioner, soins: QuerySet[Soin] | list[Any]
) -> list[SoinPraticien]:
    """Remplace l'ensemble des soins proposés par le praticien."""
    SoinPraticien.objects.filter(praticien=praticien).exclude(
        soin__in=[soin.pk for soin in soins]
    ).update(actif=False)
    liens: list[SoinPraticien] = []
    for soin in soins:
        liens.append(proposer_soin(praticien, soin))
    return liens


def get_praticien_pour_action(praticien: Practitioner) -> Practitioner:
    if not praticien.actif:
        raise ValidationError(
            {"praticien": ["Ce praticien est inactif."]}, code="practitioner_inactive"
        )
    return praticien
