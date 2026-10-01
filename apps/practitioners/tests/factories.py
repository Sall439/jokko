"""Factories des praticiens."""

import factory

from apps.accounts.tests.factories import DentistFactory
from apps.practitioners.models import Cabinet, Practitioner, Specialite


class SpecialiteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Specialite

    nom = factory.Sequence(lambda n: f"Specialite {n}")
    description = factory.Faker("sentence")


class CabinetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cabinet

    nom = factory.Sequence(lambda n: f"Cabinet {n}")
    adresse = factory.Faker("address")
    telephone = "+221338000000"
    ville = "Dakar"
    actif = True


class PractitionerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Practitioner
        skip_postgeneration_save = True

    user = factory.SubFactory(DentistFactory)
    cabinet = factory.SubFactory(CabinetFactory)
    biographie = factory.Faker("paragraph")
    annees_experience = 5
    numero_ordre = ""
    actif = True
