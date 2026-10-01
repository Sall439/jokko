"""Commande de gestion : envoi des rappels de rendez-vous.

Usage :

    python manage.py send_reminders [--horizon 24]

Sélectionne les rendez-vous confirmés débutant dans les ``horizon`` prochaines
heures et leur crée une notification « rappel » (idempotente).
"""

from datetime import timedelta
from typing import Any

from django.core.management.base import BaseCommand

from apps.notifications.services import envoyer_rappels


class Command(BaseCommand):
    help = "Envoie les rappels de rendez-vous confirmés à venir."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--horizon",
            type=int,
            default=24,
            help="Fenêtre de rappel en heures (défaut : 24).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        horizon = max(int(options["horizon"]), 1)
        nb = envoyer_rappels(horizon=timedelta(hours=horizon))
        self.stdout.write(self.style.SUCCESS(f"{nb} rappel(s) enregistré(s)."))
