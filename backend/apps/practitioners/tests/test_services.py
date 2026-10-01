import pytest
from rest_framework.exceptions import ValidationError

from apps.catalog.models import SoinPraticien
from apps.catalog.tests.factories import SoinFactory
from apps.practitioners.services import (
    get_praticien_pour_action,
    maj_soins_praticien,
    proposer_soin,
    retirer_soin,
)
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db


def test_proposer_soin_cree_le_lien() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    lien = proposer_soin(praticien, soin)
    assert lien.soin == soin
    assert lien.prix_xof is None


def test_proposer_soin_est_idempotent() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    proposer_soin(praticien, soin)
    lien = proposer_soin(praticien, soin, prix_xof=13000)
    assert SoinPraticien.objects.filter(praticien=praticien, soin=soin).count() == 1
    assert lien.prix_xof == 13000


def test_proposer_soin_refuse_prix_negatif() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    with pytest.raises(ValidationError) as exc:
        proposer_soin(praticien, soin, prix_xof=-1)

    # Liste et non chaîne : `core.exceptions` n'expose que les champs de
    # forme liste/dict dans l'enveloppe d'erreur.
    assert exc.value.detail["prix_xof"] == ["Le prix ne peut pas être négatif."]


def test_retirer_soin_desactive_le_lien() -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    proposer_soin(praticien, soin)

    retirer_soin(praticien, soin)

    assert SoinPraticien.objects.get(praticien=praticien, soin=soin).actif is False


def test_maj_soins_praticien_remplace_l_ensemble() -> None:
    praticien = PractitionerFactory()
    ancien = SoinFactory(nom="Ancien")
    nouveau = SoinFactory(nom="Nouveau")
    proposer_soin(praticien, ancien)

    liens = maj_soins_praticien(praticien, [nouveau])

    assert len(liens) == 1
    assert SoinPraticien.objects.get(praticien=praticien, soin=ancien).actif is False
    assert SoinPraticien.objects.get(praticien=praticien, soin=nouveau).actif is True


def test_get_praticien_pour_action_refuse_inactif() -> None:
    praticien = PractitionerFactory(actif=False)
    with pytest.raises(ValidationError) as exc:
        get_praticien_pour_action(praticien)

    # Liste et non chaîne : `core.exceptions` n'expose que les champs de
    # forme liste/dict dans l'enveloppe d'erreur.
    assert exc.value.detail["praticien"] == ["Ce praticien est inactif."]


def test_get_praticien_pour_action_accepte_actif() -> None:
    praticien = PractitionerFactory(actif=True)
    assert get_praticien_pour_action(praticien) == praticien
