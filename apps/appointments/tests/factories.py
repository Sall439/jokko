"""Factories de l'app `appointments`."""

from datetime import timedelta
from typing import Any

import factory

from apps.accounts.tests.factories import PatientFactory
from apps.appointments.models import Appointment
from apps.catalog.tests.factories import SoinFactory
from apps.core.utils import now
from apps.practitioners.services import proposer_soin
from apps.practitioners.tests.factories import PractitionerFactory


class AppointmentFactory(factory.django.DjangoModelFactory):
    """Rendez-vous cohérent : `fin` = durée du soin, soin proposé par le praticien."""

    class Meta:
        model = Appointment
        skip_postgeneration_save = True

    patient = factory.SubFactory(PatientFactory)
    praticien = factory.SubFactory(PractitionerFactory)
    soin = factory.SubFactory(SoinFactory)
    debut = factory.LazyFunction(lambda: now() + timedelta(days=1))
    fin = factory.LazyAttribute(
        lambda obj: obj.debut + timedelta(minutes=obj.soin.duree_minutes)
    )
    prix_xof = factory.LazyAttribute(lambda obj: obj.soin.prix_xof)
    statut = Appointment.Statut.PENDING
    notes = ""
    motif_annulation = ""

    @factory.post_generation
    def proposer_le_soin(
        self: Any, create: bool, extracted: Any, **kwargs: Any
    ) -> None:
        """Le praticien doit proposer le soin pour que le créneau soit valide."""
        if create:
            proposer_soin(self.praticien, self.soin)


class AppointmentConfirmeFactory(AppointmentFactory):
    statut = Appointment.Statut.CONFIRMED


class RendezVousAVenirFactory(AppointmentFactory):
    """Rendez-vous futur, utilisable par l'app `availability`."""

    debut = factory.LazyFunction(lambda: now() + timedelta(days=2))
