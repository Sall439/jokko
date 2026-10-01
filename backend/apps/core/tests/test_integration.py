"""Test de bout en bout : le parcours réel d'un patient, via l'API HTTP.

Scénario couvert (uniquement des appels HTTP + une commande de gestion) :

    1. l'administrateur crée le catalogue (catégorie, soin) et le praticien ;
    2. le praticien publie ses horaires et le soin qu'il propose ;
    3. le patient consulte les créneaux disponibles ;
    4. le patient réserve le premier créneau ;
    5. le praticien confirme le rendez-vous ;
    6. la commande ``send_reminders`` envoie le rappel ;
    7. le patient annule son rendez-vous (motif conservé) ;
    8. le patient relit **toutes** ses notifications.

Vérifie au passage que : le rendez-vous n'est jamais supprimé physiquement,
que les notifications sont bien générées par les signaux, et que chaque rôle
ne voit que ce qui le concerne.
"""

from datetime import UTC, datetime, time, timedelta
from typing import Any

import pytest
from django.core.management import call_command
from django.urls import reverse
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.tests.factories import AdminFactory, DentistFactory, PatientFactory
from apps.appointments.models import Appointment
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db

#: Instant de départ du scénario (un vendredi) : le premier jour ouvré
#: reservable tombe le lundi suivant.
DEPART = datetime(2030, 5, 24, 8, 0, tzinfo=UTC)


def _lundi_suivant(reference: datetime) -> Any:
    return (reference + timedelta(days=(7 - reference.weekday()) % 7)).date()


def test_parcours_complet_patient_praticien_admin(api_client: APIClient) -> None:
    with freeze_time(DEPART):
        # ---------------------------------------------------------- 1. admin
        admin = AdminFactory()
        dentiste = DentistFactory()
        patient = PatientFactory()
        api_client.force_login(admin)

        categorie = api_client.post(
            reverse("categorie-soin-list"),
            {"nom": "Prévention", "description": "Soins de prévention"},
            format="json",
        )
        assert categorie.status_code == 201, categorie.json()
        categorie_id = categorie.json()["id"]

        soin = api_client.post(
            reverse("soin-list"),
            {
                "nom": "Détartrage",
                "description": "Nettoyage complet",
                "duree_minutes": 45,
                "prix_xof": 20000,
                "categorie": categorie_id,
            },
            format="json",
        )
        assert soin.status_code == 201, soin.json()
        soin_id = soin.json()["id"]

        cabinet = api_client.post(
            reverse("cabinet-list"),
            {"nom": "JokkoDentiste", "adresse": "Dakar", "ville": "Dakar"},
            format="json",
        )
        assert cabinet.status_code == 201, cabinet.json()

        specialite = api_client.post(
            reverse("specialite-list"), {"nom": "Endodontie"}, format="json"
        )
        assert specialite.status_code == 201, specialite.json()

        profil = api_client.post(
            reverse("praticien-list"),
            {
                "user": str(dentiste.id),
                "cabinet": cabinet.json()["id"],
                "specialites": [specialite.json()["id"]],
                "annees_experience": 7,
            },
            format="json",
        )
        assert profil.status_code == 201, profil.json()
        praticien_id = profil.json()["id"]

        # ------------------------------------------------------- 2. praticien
        api_client.force_login(dentiste)
        lundi = _lundi_suivant(DEPART)
        for jour in range(5):  # lundi → vendredi
            horaire = api_client.post(
                reverse("horaire-list"),
                {
                    "praticien": praticien_id,
                    "jour": jour,
                    "heure_debut": "09:00",
                    "heure_fin": "13:00",
                },
                format="json",
            )
            assert horaire.status_code == 201, horaire.json()

        propose = api_client.post(
            reverse("praticien-soins-proposes", args=[praticien_id]),
            {"soin": soin_id},
            format="json",
        )
        assert propose.status_code == 200, propose.json()

        # -------------------------------------------------------- 3. créneaux
        api_client.force_login(patient)
        creneaux = api_client.get(
            reverse("creneaux"),
            {
                "praticien": praticien_id,
                "soin": soin_id,
                "date_debut": str(lundi),
                "date_fin": str(lundi),
            },
        )
        assert creneaux.status_code == 200, creneaux.json()
        liste = creneaux.json()
        assert len(liste) > 0
        assert liste[0]["debut_local"].startswith(str(lundi))

        # -------------------------------------------------------- 4. réserve
        reservation = api_client.post(
            reverse("rendez-vous-list"),
            {
                "praticien": praticien_id,
                "soin": soin_id,
                "debut": liste[0]["debut"],
                "notes": "Première visite",
            },
            format="json",
        )
        assert reservation.status_code == 201, reservation.json()
        rdv_id = reservation.json()["id"]
        assert reservation.json()["statut"] == Appointment.Statut.PENDING
        assert reservation.json()["prix_xof"] == 20000
        assert reservation.json()["duree_minutes"] == 45

        # -------------------------------------------------------- 5. confirme
        api_client.force_login(dentiste)
        confirmation = api_client.post(
            reverse("rendez-vous-confirmer", args=[rdv_id]), {}, format="json"
        )
        assert confirmation.status_code == 200, confirmation.json()
        assert confirmation.json()["statut"] == Appointment.Statut.CONFIRMED

        # ------------------------------------------------------- 6. rappel
        call_command("send_reminders", "--horizon", "96", verbosity=0)
        assert Notification.objects.filter(
            rendez_vous_id=rdv_id, type=Notification.Type.RAPPEL
        ).exists()

        # ------------------------------------------------------ 7. annulation
        api_client.force_login(patient)
        annulation = api_client.post(
            reverse("rendez-vous-annuler", args=[rdv_id]),
            {"motif": "Empêchement professionnel."},
            format="json",
        )
        assert annulation.status_code == 200, annulation.json()
        assert annulation.json()["statut"] == Appointment.Statut.ANNULE
        assert annulation.json()["motif_annulation"] == "Empêchement professionnel."

        # Le rendez-vous existe toujours (aucune suppression physique).
        rdv = Appointment.objects.get(pk=rdv_id)
        assert rdv.statut == Appointment.Statut.ANNULE
        # pk str (instance fraîche) vs uuid.UUID (rechargé) : comparaison via str.
        assert str(rdv.annule_par_id) == str(patient.id)

        # ------------------------------------------------------ 8. historique
        historique = api_client.get(reverse("notification-list"))
        assert historique.status_code == 200
        types = sorted(
            item["type"] for item in historique.json()["data"]
        )
        assert types == [
            Notification.Type.RDV_ANNULE,
            Notification.Type.RDV_CONFIRME,
            Notification.Type.RDV_CREE,
            Notification.Type.RAPPEL,
        ]

        # Le patient ne voit que ses notifications…
        assert all(
            item["destinataire"] == str(patient.id)
            for item in historique.json()["data"]
        )
        # …et l'administrateur, lui, voit tout.
        api_client.force_login(admin)
        assert api_client.get(reverse("notification-list")).json()["meta"]["total"] == 4


def test_parcours_refuse_les_roles_hors_scope(api_client: APIClient) -> None:
    """Un patient ne peut pas confirmer, un praticien ne réserve pas pour autrui."""
    with freeze_time(DEPART):
        admin = AdminFactory()
        dentiste = DentistFactory()
        autre_patient = PatientFactory()
        lundi = _lundi_suivant(DEPART)

        from apps.catalog.tests.factories import CategorieSoinFactory, SoinFactory
        from apps.practitioners.services import proposer_soin
        from apps.practitioners.tests.factories import PractitionerFactory

        soin = SoinFactory(categorie=CategorieSoinFactory(), duree_minutes=30)
        praticien = PractitionerFactory(user=dentiste)
        proposer_soin(praticien, soin)

        api_client.force_login(admin)
        horaire = api_client.post(
            reverse("horaire-list"),
            {
                "praticien": str(praticien.id),
                "jour": lundi.weekday(),
                "heure_debut": "09:00",
                "heure_fin": "13:00",
            },
            format="json",
        )
        assert horaire.status_code == 201, horaire.json()

        # Un patient ne réserve pas pour quelqu'un d'autre (payload ignoré :
        # le patient est déduit de l'utilisateur authentifié).
        patient = PatientFactory()
        api_client.force_login(patient)
        creneaux = api_client.get(
            reverse("creneaux"),
            {
                "praticien": str(praticien.id),
                "soin": str(soin.id),
                "date_debut": str(lundi),
                "date_fin": str(lundi),
            },
        ).json()
        assert creneaux

        rdv = api_client.post(
            reverse("rendez-vous-list"),
            {
                "praticien": str(praticien.id),
                "soin": str(soin.id),
                "debut": creneaux[0]["debut"],
            },
            format="json",
        )
        assert rdv.status_code == 201
        assert str(rdv.json()["patient"]) == str(patient.id)
        rdv_id = rdv.json()["id"]

        # Un autre patient ne peut ni voir ni annuler ce rendez-vous.
        api_client.force_login(autre_patient)
        assert (
            api_client.get(reverse("rendez-vous-detail", args=[rdv_id])).status_code
            == 404
        )
        assert (
            api_client.post(
                reverse("rendez-vous-annuler", args=[rdv_id]),
                {"motif": "Tentative"},
                format="json",
            ).status_code
            == 404
        )
        assert api_client.get(reverse("notification-list")).json()["meta"]["total"] == 0

        # Le patient ne confirme pas son propre rendez-vous (réservé au staff).
        api_client.force_login(patient)
        assert (
            api_client.post(
                reverse("rendez-vous-confirmer", args=[rdv_id]), {}, format="json"
            ).status_code
            == 403
        )

        # Le praticien confirme puis annule (dans la fenêtre de 24 h).
        api_client.force_login(dentiste)
        assert (
            api_client.post(
                reverse("rendez-vous-confirmer", args=[rdv_id]), {}, format="json"
            ).status_code
            == 200
        )
        assert (
            api_client.post(
                reverse("rendez-vous-annuler", args=[rdv_id]),
                {"motif": "Changement de planning"},
                format="json",
            ).status_code
            == 200
        )
        assert Appointment.objects.get(pk=rdv_id).statut == Appointment.Statut.ANNULE

        # Nouvelle réservation : à moins de 24 h, l'annulation est refusée.
        api_client.force_login(patient)
        creneaux = api_client.get(
            reverse("creneaux"),
            {
                "praticien": str(praticien.id),
                "soin": str(soin.id),
                "date_debut": str(lundi + timedelta(days=7)),
                "date_fin": str(lundi + timedelta(days=7)),
            },
        ).json()
        assert creneaux
        dernier = api_client.post(
            reverse("rendez-vous-list"),
            {
                "praticien": str(praticien.id),
                "soin": str(soin.id),
                "debut": creneaux[0]["debut"],
            },
            format="json",
        )
        assert dernier.status_code == 201, dernier.json()
        rdv_id2 = dernier.json()["id"]

        # Une heure avant le rendez-vous : hors fenêtre d'annulation.
        with freeze_time(datetime(2030, 6, 3, 8, 0, tzinfo=UTC)):
            api_client.force_login(dentiste)
            trop_tard = api_client.post(
                reverse("rendez-vous-confirmer", args=[rdv_id2]),
                {},
                format="json",
            )
            assert trop_tard.status_code == 200, trop_tard.json()
            refuse = api_client.post(
                reverse("rendez-vous-annuler", args=[rdv_id2]),
                {"motif": "Trop tard"},
                format="json",
            )
            assert refuse.status_code == 400, refuse.json()
            assert Appointment.objects.get(pk=rdv_id2).statut == (
                Appointment.Statut.CONFIRMED
            )


def test_conflit_de_double_reservation_refuse(api_client: APIClient) -> None:
    """Deux patients ne peuvent pas prendre le même créneau (unicité/exclusion)."""
    with freeze_time(DEPART):
        from apps.catalog.tests.factories import CategorieSoinFactory, SoinFactory
        from apps.practitioners.services import proposer_soin
        from apps.practitioners.tests.factories import PractitionerFactory

        soin = SoinFactory(categorie=CategorieSoinFactory(), duree_minutes=30)
        praticien = PractitionerFactory()
        proposer_soin(praticien, soin)
        lundi = _lundi_suivant(DEPART)

        from apps.availability.tests.factories import HoraireHebdomadaireFactory

        HoraireHebdomadaireFactory(
            praticien=praticien,
            jour=lundi.weekday(),
            heure_debut=time(9, 0),
            heure_fin=time(13, 0),
        )

        premier = PatientFactory()
        second = PatientFactory()
        creneaux = api_client.get(
            reverse("creneaux"),
            {
                "praticien": str(praticien.id),
                "soin": str(soin.id),
                "date_debut": str(lundi),
                "date_fin": str(lundi),
            },
        )
        # Anonyme : 401 avant toute logique métier.
        assert creneaux.status_code == 401

        api_client.force_login(premier)
        debut = api_client.get(
            reverse("creneaux"),
            {
                "praticien": str(praticien.id),
                "soin": str(soin.id),
                "date_debut": str(lundi),
                "date_fin": str(lundi),
            },
        ).json()[0]["debut"]

        assert (
            api_client.post(
                reverse("rendez-vous-list"),
                {"praticien": str(praticien.id), "soin": str(soin.id), "debut": debut},
                format="json",
            ).status_code
            == 201
        )

        api_client.force_login(second)
        conflit = api_client.post(
            reverse("rendez-vous-list"),
            {"praticien": str(praticien.id), "soin": str(soin.id), "debut": debut},
            format="json",
        )
        assert conflit.status_code == 400
        assert conflit.json()["fields"]["debut"]
        en_attente = Appointment.objects.filter(statut=Appointment.Statut.PENDING)
        assert en_attente.count() == 1


def test_utilisateur_inconnu_401() -> None:
    """Rappel : l'API refuse l'anonyme (garde-fou de session/JWT)."""
    client: APIClient = APIClient()
    assert client.get(reverse("rendez-vous-list")).status_code == 401
    assert client.get(reverse("notification-list")).status_code == 401
