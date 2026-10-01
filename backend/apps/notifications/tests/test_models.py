"""Tests du modèle `Notification`."""

from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction

from apps.appointments.tests.factories import AppointmentFactory
from apps.notifications.models import Notification
from apps.notifications.tests.factories import NotificationFactory, RappelFactory

pytestmark = pytest.mark.django_db


def test_representation() -> None:
    notification = NotificationFactory(sujet="Rendez-vous confirmé")
    assert str(notification) == (
        "Demande de rendez-vous → "
        f"{notification.destinataire} (Rendez-vous confirmé)"
    )


def test_destinataire_nom() -> None:
    notification = NotificationFactory()
    assert notification.destinataire_nom == (
        f"{notification.destinataire.prenom} {notification.destinataire.nom}"
    )


def test_unicite_par_rdv_type_canal() -> None:
    """Un seul rappel par rendez-vous : la base refuse le doublon."""
    rdv = AppointmentFactory()
    NotificationFactory(
        rendez_vous=rdv,
        type=Notification.Type.RAPPEL,
        canal=Notification.Canal.EMAIL,
        destinataire=rdv.patient,
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        Notification.objects.create(
            destinataire=rdv.patient,
            rendez_vous=rdv,
            type=Notification.Type.RAPPEL,
            canal=Notification.Canal.EMAIL,
            sujet="Doublon",
            message="Doublon",
        )


def test_unicite_n_empeche_pas_un_autre_type() -> None:
    """La contrainte porte sur (rdv, type, canal) : un autre type passe."""
    rdv = AppointmentFactory()
    rappel = RappelFactory(rendez_vous=rdv, destinataire=rdv.patient)
    Notification.objects.create(
        destinataire=rdv.patient,
        rendez_vous=rdv,
        type=Notification.Type.RDV_CONFIRME,
        canal=Notification.Canal.EMAIL,
        sujet="Confirmé",
        message="Confirmé",
    )
    assert rappel.pk is not None
    # RDV_CREE (création du rendez-vous) + RAPPEL + RDV_CONFIRME.
    assert Notification.objects.filter(rendez_vous=rdv).count() == 3


def test_contraintes_dates_par_defaut() -> None:
    creation = NotificationFactory()
    assert creation.envoi_le is not None
    assert creation.envoi_le - creation.created_at < timedelta(seconds=5)
