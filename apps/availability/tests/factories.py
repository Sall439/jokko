"""Factories de l'app `availability`."""

from datetime import date, time, timedelta

import factory

from apps.availability.models import ExceptionDisponibilite, HoraireHebdomadaire
from apps.practitioners.tests.factories import PractitionerFactory


class HoraireHebdomadaireFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = HoraireHebdomadaire

    praticien = factory.SubFactory(PractitionerFactory)
    jour = 0  # lundi
    heure_debut = time(9, 0)
    heure_fin = time(13, 0)
    actif = True


class ExceptionDisponibiliteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ExceptionDisponibilite

    praticien = factory.SubFactory(PractitionerFactory)
    date = factory.LazyFunction(lambda: date.today() + timedelta(days=7))
    type = "conge"
    motif = "Congé annuel"
    heure_debut = None
    heure_fin = None
