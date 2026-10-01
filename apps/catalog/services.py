from django.db import transaction

from apps.catalog.models import Soin


@transaction.atomic
def desactiver_soin(soin: Soin) -> Soin:
    """Un soin inactif n'est plus proposé (les RDV existants sont conservés)."""
    if soin.actif:
        soin.actif = False
        soin.save(update_fields=["actif", "updated_at"])
    return soin


@transaction.atomic
def activer_soin(soin: Soin) -> Soin:
    if not soin.actif:
        soin.actif = True
        soin.save(update_fields=["actif", "updated_at"])
    return soin
