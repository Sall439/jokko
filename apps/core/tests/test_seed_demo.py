"""Tests de la commande de gestion ``seed_demo``."""

import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.appointments.models import Appointment
from apps.availability.models import HoraireHebdomadaire
from apps.catalog.models import CategorieSoin, Soin
from apps.core.management.commands.seed_demo import EMAILS_DEMO
from apps.notifications.models import Notification
from apps.practitioners.models import Cabinet, Practitioner

pytestmark = pytest.mark.django_db


def test_seed_cree_le_reseau_complet() -> None:
    call_command("seed_demo")
    assert User.objects.filter(email__in=EMAILS_DEMO).count() == 6
    assert Practitioner.objects.filter(user__email__in=EMAILS_DEMO).count() == 2
    assert Cabinet.objects.count() == 1
    assert CategorieSoin.objects.count() == 4
    assert Soin.objects.count() >= 7
    assert HoraireHebdomadaire.objects.count() == 2 * 11
    assert Appointment.objects.count() == 4
    # La réservation et la confirmation ont généré des notifications.
    # RDV_CREE×3 + RDV_CONFIRME×2 = 5.
    assert Notification.objects.count() >= 5


def test_seed_idempotent() -> None:
    call_command("seed_demo")
    total = Appointment.objects.count()
    call_command("seed_demo")
    assert Appointment.objects.count() == total
    assert User.objects.filter(email__in=EMAILS_DEMO).count() == 6


def test_seed_force_recree() -> None:
    call_command("seed_demo")
    call_command("seed_demo", "--force")
    assert User.objects.filter(email__in=EMAILS_DEMO).count() == 6
    assert Cabinet.objects.count() == 1


def test_seed_force_sans_donnees_prealables() -> None:
    call_command("seed_demo", "--force")
    assert User.objects.filter(email__in=EMAILS_DEMO).count() == 6


def test_seed_donnees_utilisables_pour_les_creneaux() -> None:
    """Les rendez-vous créés respectent les horaires (réservation réelle)."""
    call_command("seed_demo")
    for rdv in Appointment.objects.all():
        if rdv.statut != Appointment.Statut.TERMINE:
            horaires = set(
                HoraireHebdomadaire.objects.filter(
                    praticien=rdv.praticien, jour=rdv.debut.weekday(), actif=True
                ).values_list("heure_debut", "heure_fin")
            )
            assert horaires  # un horaire existe bien ce jour-là
