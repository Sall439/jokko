"""Factories du catalogue."""

import factory

from apps.catalog.models import CategorieSoin, Soin, SoinPraticien


class CategorieSoinFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CategorieSoin

    nom = factory.Sequence(lambda n: f"Categorie {n}")
    description = factory.Faker("sentence")
    ordre = 0


class SoinFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Soin

    nom = factory.Sequence(lambda n: f"Soin {n}")
    description = factory.Faker("sentence")
    duree_minutes = 30
    prix_xof = 15000
    categorie = factory.SubFactory(CategorieSoinFactory)
    actif = True


class SoinPraticienFactory(factory.django.DjangoModelFactory):
    """Reference de type : `praticien` doit etre fourni par l'appelant."""

    class Meta:
        model = SoinPraticien
        skip_postgeneration_save = True

    # Reference par chaine : evite une importation circulaire avec l'app
    # `practitioners` (qui importe elle-meme ce module).
    praticien = factory.SubFactory(
        "apps.practitioners.tests.factories.PractitionerFactory"
    )
    soin = factory.SubFactory(SoinFactory)
    prix_xof = None
    actif = True
