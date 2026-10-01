"""Données de démonstration (commande ``seed_demo``).

Crée un réseau cohérent et immédiatement utilisable :

    * 1 administrateur + 1 cabinet + 2 spécialités ;
    * 2 praticiens (Dr Awa Ndiaye, Dr Moussa Fall) avec soins proposés
      et horaires hebdomadaires ;
    * 3 patients ;
    * des soins/catégories du catalogue ;
    * quelques rendez-vous (historique terminé, en attente, confirmé) et une
      exception de disponibilité (congé).

Idempotente : relancer la commande ne crée rien de plus. ``--force``
supprime les données de démo existantes *puis* recrée le tout.

Usage :

    python manage.py seed_demo [--force]
"""

from datetime import time, timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from apps.appointments.models import Appointment
from apps.appointments.services import confirmer, reserver
from apps.availability.models import ExceptionDisponibilite, HoraireHebdomadaire
from apps.catalog.models import CategorieSoin, Soin
from apps.core.utils import combine_local, local_date, now
from apps.notifications.models import Notification
from apps.practitioners.models import Cabinet, Practitioner, Specialite
from apps.practitioners.selectors import get_practitioners
from apps.practitioners.services import proposer_soin

User = get_user_model()

MOT_DE_PASSE = "JokkoDemo2026!"
DOMAINE = "@jokkodentiste.sn"

EMAILS_DEMO: tuple[str, ...] = (
    f"admin{DOMAINE}",
    f"awa.ndiaye{DOMAINE}",
    f"moussa.fall{DOMAINE}",
    f"patient1{DOMAINE}",
    f"patient2{DOMAINE}",
    f"patient3{DOMAINE}",
)

SOINS: tuple[dict[str, Any], ...] = (
    {"nom": "Consultation", "duree_minutes": 30, "prix_xof": 10000,
     "categorie": "Prévention"},
    {"nom": "Détartrage", "duree_minutes": 45, "prix_xof": 20000,
     "categorie": "Prévention"},
    {"nom": "Dévitalisation", "duree_minutes": 60, "prix_xof": 45000,
     "categorie": "Soins"},
    {"nom": "Extraction dentaire", "duree_minutes": 30, "prix_xof": 25000,
     "categorie": "Chirurgie"},
    {"nom": "Implant dentaire", "duree_minutes": 90, "prix_xof": 350000,
     "categorie": "Chirurgie"},
    {"nom": "Blanchiment", "duree_minutes": 60, "prix_xof": 60000,
     "categorie": "Esthétique"},
    {"nom": "Couronne céramique", "duree_minutes": 90, "prix_xof": 150000,
     "categorie": "Esthétique"},
)

SPECIALITES: tuple[str, ...] = ("Endodontie", "Chirurgie buccale")

#: (jour, heure_debut, heure_fin) — lundi=0 ... vendredi=4, samedi=5.
HORAIRES: tuple[tuple[int, str, str], ...] = (
    (0, "09:00", "13:00"),
    (0, "14:30", "18:30"),
    (1, "09:00", "13:00"),
    (1, "14:30", "18:30"),
    (2, "09:00", "13:00"),
    (2, "14:30", "18:30"),
    (3, "09:00", "13:00"),
    (3, "14:30", "18:30"),
    (4, "09:00", "13:00"),
    (4, "14:30", "18:30"),
    (5, "09:00", "12:00"),
)


def _heure(valeur: str) -> time:
    heures, minutes = valeur.split(":")
    return time(int(heures), int(minutes))


def _jour_ouvre(decalage: int = 1) -> Any:
    """`decalage`-ième jour ouvré (lundi→vendredi) après aujourd'hui.

    Évite de retomber un samedi ou un dimanche (aucun horaire) : la commande
    doit fonctionner quel que soit le jour de la semaine où elle est lancée.
    """
    jour = local_date(now())
    restants = decalage
    while True:
        jour += timedelta(days=1)
        if jour.weekday() < 5:
            restants -= 1
            if restants == 0:
                return jour


def _jour_ouvre_precedent() -> Any:
    """Dernier jour ouvré strictement antérieur à aujourd'hui."""
    jour = local_date(now())
    while True:
        jour -= timedelta(days=1)
        if jour.weekday() < 5:
            return jour


class Command(BaseCommand):
    help = "Crée un jeu de données de démonstration pour JokkoDentiste."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--force",
            action="store_true",
            help="Supprime les données de démo existantes avant de recréer.",
        )

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        if options["force"]:
            self._nettoyer()
        elif User.objects.filter(email__in=EMAILS_DEMO).exists():
            self.stdout.write(
                self.style.WARNING(
                    "Les données de démo existent déjà — rien à faire "
                    "(utilisez --force pour recréer)."
                )
            )
            return

        self._creer_admin()
        cabinet = self._creer_cabinet()
        specialites = self._creer_specialites()
        categories = self._creer_categories()
        soins = self._creer_soins(categories)
        patients = self._creer_patients()

        awa = self._creer_praticien(
            email=f"awa.ndiaye{DOMAINE}",
            prenom="Awa",
            nom="Ndiaye",
            cabinet=cabinet,
            specialites=[specialites[0]],
            annees_experience=8,
            numero_ordre="SN-ORD-2020-0142",
        )
        moussa = self._creer_praticien(
            email=f"moussa.fall{DOMAINE}",
            prenom="Moussa",
            nom="Fall",
            cabinet=cabinet,
            specialites=[specialites[1]],
            annees_experience=12,
            numero_ordre="SN-ORD-2014-0067",
        )

        # Soins proposés : Awa couvre tout, Moussa tout sauf l'esthétique.
        for soin in soins:
            proposer_soin(awa, soin)
        for soin in soins:
            if soin.categorie.nom != "Esthétique":
                proposer_soin(moussa, soin)

        self._creer_horaires(awa)
        self._creer_horaires(moussa)
        self._creer_exception_conge(awa)
        self._creer_rendez_vous(awa, moussa, patients, soins)

        self.stdout.write(self.style.SUCCESS("Données de démonstration créées :"))
        self.stdout.write(f"  • Admin     : admin{DOMAINE} / {MOT_DE_PASSE}")
        self.stdout.write(f"  • Praticien : awa.ndiaye{DOMAINE} / {MOT_DE_PASSE}")
        self.stdout.write(f"  • Praticien : moussa.fall{DOMAINE} / {MOT_DE_PASSE}")
        self.stdout.write(
            f"  • Patients  : patient1, patient2, patient3{DOMAINE} "
            f"(même mot de passe)"
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"  • {User.objects.count()} utilisateurs, "
                f"{len(soins)} soins, {Appointment.objects.count()} rendez-vous."
            )
        )
        self.stdout.write(
            "  Interface admin : "
            f"http://localhost:8000/{settings.ADMIN_URL}"
        )

    # ------------------------------------------------------------- création

    def _creer_admin(self) -> Any:
        return User.objects.create_superuser(
            email=f"admin{DOMAINE}",
            password=MOT_DE_PASSE,
            prenom="Fatou",
            nom="Diallo",
            role="admin",
        )

    def _creer_cabinet(self) -> Cabinet:
        return Cabinet.objects.create(
            nom="JokkoDentiste — Plateaux",
            adresse="12, rue des Almadies, Plateau",
            telephone="+221 33 820 00 00",
            ville="Dakar",
            latitude="14.6899",
            longitude="-17.4452",
        )

    def _creer_specialites(self) -> list[Specialite]:
        return [
            Specialite.objects.get_or_create(nom=nom)[0] for nom in SPECIALITES
        ]

    def _creer_categories(self) -> dict[str, CategorieSoin]:
        categories = ("Prévention", "Soins", "Chirurgie", "Esthétique")
        return {
            nom: CategorieSoin.objects.get_or_create(nom=nom, defaults={"ordre": i})[0]
            for i, nom in enumerate(categories, start=1)
        }

    def _creer_soins(self, categories: dict[str, CategorieSoin]) -> list[Soin]:
        soins: list[Soin] = []
        for donnees in SOINS:
            soin, _ = Soin.objects.get_or_create(
                nom=donnees["nom"],
                defaults={
                    "duree_minutes": donnees["duree_minutes"],
                    "prix_xof": donnees["prix_xof"],
                    "categorie": categories[donnees["categorie"]],
                },
            )
            soins.append(soin)
        return soins

    def _creer_patients(self) -> list[Any]:
        profils = (
            ("Aminata", "Sow"),
            ("Ousmane", "Diop"),
            ("Mariama", "Ndiaye"),
        )
        patients: list[Any] = []
        for i, (prenom, nom) in enumerate(profils, start=1):
            patient = User.objects.create_user(
                email=f"patient{i}{DOMAINE}",
                password=MOT_DE_PASSE,
                prenom=prenom,
                nom=nom,
                role="patient",
                telephone=f"+2217710000{i:03d}",
            )
            patients.append(patient)
        return patients

    def _creer_praticien(
        self,
        *,
        email: str,
        prenom: str,
        nom: str,
        cabinet: Cabinet,
        specialites: list[Specialite],
        annees_experience: int,
        numero_ordre: str,
    ) -> Practitioner:
        utilisateur = User.objects.create_user(
            email=email,
            password=MOT_DE_PASSE,
            prenom=prenom,
            nom=nom,
            role="dentiste",
            telephone="+221770000000",
        )
        praticien = Practitioner.objects.create(
            user=utilisateur,
            cabinet=cabinet,
            annees_experience=annees_experience,
            numero_ordre=numero_ordre,
            biographie=(
                "Praticien du cabinet JokkoDentiste, spécialiste reconnu à Dakar."
            ),
        )
        praticien.specialites.set(specialites)
        return praticien

    def _creer_horaires(self, praticien: Practitioner) -> None:
        for jour, debut, fin in HORAIRES:
            HoraireHebdomadaire.objects.get_or_create(
                praticien=praticien,
                jour=jour,
                heure_debut=_heure(debut),
                defaults={"heure_fin": _heure(fin)},
            )

    def _creer_exception_conge(self, praticien: Practitioner) -> None:
        """Un congé dans deux semaines (démo de la gestion des exceptions)."""
        jour = _jour_ouvre(10)
        ExceptionDisponibilite.objects.get_or_create(
            praticien=praticien,
            date=jour,
            defaults={"type": "conge", "motif": "Congé annuel"},
        )

    def _creer_rendez_vous(
        self,
        awa: Practitioner,
        moussa: Practitioner,
        patients: list[Any],
        soins: list[Soin],
    ) -> None:
        """Rendez-vous futurs (réservés proprement) + un historique terminé."""
        consultation = next(s for s in soins if s.nom == "Consultation")
        detartrage = next(s for s in soins if s.nom == "Détartrage")
        extraction = next(s for s in soins if s.nom == "Extraction dentaire")

        rdv1 = reserver(
            patient=patients[0],
            praticien=awa,
            soin=consultation,
            debut=combine_local(_jour_ouvre(1), _heure("10:00")),
            notes="Douleur légère à la molaire droite.",
        )
        confirmer(rdv1)

        reserver(
            patient=patients[1],
            praticien=awa,
            soin=detartrage,
            debut=combine_local(_jour_ouvre(2), _heure("11:00")),
        )

        rdv3 = reserver(
            patient=patients[2],
            praticien=moussa,
            soin=extraction,
            debut=combine_local(_jour_ouvre(2), _heure("14:30")),
        )
        confirmer(rdv3)

        # Historique : un rendez-vous terminé au dernier jour ouvré passé.
        hier = _jour_ouvre_precedent()
        Appointment.objects.create(
            patient=patients[0],
            praticien=awa,
            soin=consultation,
            debut=combine_local(hier, _heure("09:00")),
            fin=combine_local(hier, _heure("09:30")),
            statut=Appointment.Statut.TERMINE,
            prix_xof=consultation.prix_xof,
        )

    # ------------------------------------------------------------- nettoyage

    def _nettoyer(self) -> None:
        """Supprime les données de démo (et seulement elles)."""
        ids_praticiens = list(
            get_practitioners(only_active=False)
            .filter(user__email__in=EMAILS_DEMO)
            .values_list("id", flat=True)
        )
        # RDV de démo = liés à un praticien *ou* à un patient de démo.
        rdv_demo = Appointment.objects.filter(
            Q(praticien_id__in=ids_praticiens)
            | Q(patient__email__in=EMAILS_DEMO)
        )
        Notification.objects.filter(
            Q(rendez_vous__praticien_id__in=ids_praticiens)
            | Q(rendez_vous__patient__email__in=EMAILS_DEMO)
            | Q(destinataire__email__in=EMAILS_DEMO)
        ).delete()
        # `hard_delete()` : `delete()` annule par défaut (jamais de suppression
        # physique) ; le seed a besoin de purger réellement ses données.
        rdv_demo.hard_delete()
        HoraireHebdomadaire.objects.filter(praticien_id__in=ids_praticiens).delete()
        ExceptionDisponibilite.objects.filter(
            praticien_id__in=ids_praticiens
        ).delete()

        # Soins proposés / soins du catalogue créés par le seed.
        # (les soins libellés sont identifiables ; on ne touche pas aux autres)
        noms_soins = [donnees["nom"] for donnees in SOINS]
        Soin.objects.filter(nom__in=noms_soins).delete()
        CategorieSoin.objects.filter(nom__in=("Prévention", "Soins", "Chirurgie",
                                              "Esthétique")).delete()

        User.objects.filter(email__in=EMAILS_DEMO).delete()
        Cabinet.objects.filter(nom__startswith="JokkoDentiste").delete()

        self.stdout.write(
            self.style.WARNING("Données de démonstration supprimées — recréation…")
        )
