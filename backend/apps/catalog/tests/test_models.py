import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.catalog.models import Soin
from apps.catalog.tests.factories import CategorieSoinFactory, SoinFactory

pytestmark = pytest.mark.django_db


def test_str_soin() -> None:
    soin = SoinFactory(nom="Détartrage", duree_minutes=45, prix_xof=20000)
    assert str(soin) == "Détartrage (45 min - 20000 XOF)"


@pytest.mark.parametrize(
    "minutes,expected",
    [
        (5, "5 min"),
        (30, "30 min"),
        (45, "45 min"),
        (60, "1h"),
        (90, "1h30"),
        (120, "2h"),
    ],
)
def test_creneau_fin_formatting(minutes: int, expected: str) -> None:
    soin = SoinFactory(duree_minutes=minutes)
    assert soin.creneau_fin == expected


def test_categorie_str_and_ordering() -> None:
    seconde = CategorieSoinFactory(nom="Chirurgie", ordre=2)
    premiere = CategorieSoinFactory(nom="Prévention", ordre=1)
    from apps.catalog.models import CategorieSoin

    assert str(seconde) == "Chirurgie"
    assert list(CategorieSoin.objects.order_by("ordre"))[0] == premiere


def test_unique_nom_categorie() -> None:
    CategorieSoinFactory(nom="Orthodontie")
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            CategorieSoinFactory._meta.model.objects.create(nom="Orthodontie")


def test_prix_ne_peut_pas_etre_negatif() -> None:
    soin = SoinFactory.build(prix_xof=-1)
    with pytest.raises(ValidationError):
        soin.full_clean()


def test_duree_minimum_5_minutes() -> None:
    soin = SoinFactory.build(duree_minutes=1)
    with pytest.raises(ValidationError):
        soin.full_clean()


def test_contrainte_prix_positif_en_base() -> None:
    """La contrainte SQL protège la base même en cas d'écriture directe."""
    categorie = CategorieSoinFactory()
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Soin.objects.create(
                nom="Soin pirate", duree_minutes=30, prix_xof=-500, categorie=categorie
            )
