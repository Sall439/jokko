"""Factories de l'app `notifications`."""

from datetime import timedelta
from typing import Any

import factory

from apps.accounts.tests.factories import PatientFactory
from apps.appointments.tests.factories import AppointmentFactory
from apps.core.utils import now
from apps.notifications.models import Notification


class NotificationFactory(factory.django.DjangoModelFactory):
    """Notification cohérente : contenu généré comme dans le service.

    Par défaut **sans rendez-vous** : la création d'un rendez-vous via sa
    factory déclenche elle-même une notification (signal) ; on évite donc
    toute collision avec la contrainte d'unicité (rdv, type, canal).
    """

    class Meta:
        model = Notification

    destinataire = factory.SubFactory(PatientFactory)
    rendez_vous = None
    type = Notification.Type.RDV_CREE
    canal = Notification.Canal.EMAIL
    sujet = factory.LazyAttribute(lambda obj: f"Notification {obj.type}")
    message = factory.Faker("sentence")
    statut = Notification.Statut.ENVOYEE
    lue = False
    envoi_le = factory.LazyFunction(lambda: now())
    erreur = ""

    @factory.post_generation
    def aligner_contenu(self: Any, create: bool, extracted: Any, **kwargs: Any) -> None:
        """Le destinataire doit être le patient du rendez-vous (cohérence)."""
        if create and self.rendez_vous is not None:
            self.destinataire = self.rendez_vous.patient
            self.save()


class RappelFactory(NotificationFactory):
    """Rappel : rendez-vous à venir, type dédié (idempotence)."""

    type = Notification.Type.RAPPEL
    rendez_vous = factory.SubFactory(
        AppointmentFactory,
        debut=factory.LazyFunction(lambda: now() + timedelta(hours=6)),
        statut="confirmed",
    )
