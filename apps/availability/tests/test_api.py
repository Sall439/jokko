"""Tests des endpoints de l'app `availability`."""

from datetime import time

import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import AdminFactory, DentistFactory, PatientFactory
from apps.availability.models import ExceptionDisponibilite, HoraireHebdomadaire
from apps.availability.tests.factories import (
    ExceptionDisponibiliteFactory,
    HoraireHebdomadaireFactory,
)
from apps.catalog.tests.factories import SoinFactory
from apps.practitioners.services import proposer_soin
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_client(api_client: APIClient) -> APIClient:
    api_client.force_login(AdminFactory())
    return api_client


@pytest.fixture
def as_dentist(api_client: APIClient) -> tuple[APIClient, User]:
    user = DentistFactory()
    api_client.force_login(user)
    return api_client, user


@pytest.fixture
def patient_client(api_client: APIClient) -> APIClient:
    api_client.force_login(PatientFactory())
    return api_client


@pytest.fixture
def patient(api_client: APIClient) -> tuple[APIClient, User]:
    """Client + patient, connecté *après* un éventuel `freeze_time`.

    La session Django a une durée de vie : la connecter dans le corps du test
    (et non dans la fixture) garantit qu'elle est valide sous `freeze_time`.
    """
    user = PatientFactory()
    return api_client, user


# --------------------------------------------------------------------- schedules


def test_liste_horaires_exige_authentification(api_client: APIClient) -> None:
    assert api_client.get(reverse("horaire-list")).status_code == 401


def test_patient_peut_lire_les_horaires(patient_client: APIClient) -> None:
    HoraireHebdomadaireFactory()
    response = patient_client.get(reverse("horaire-list"))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_admin_cree_un_horaire(admin_client: APIClient) -> None:
    praticien = PractitionerFactory()
    response = admin_client.post(
        reverse("horaire-list"),
        {
            "praticien": str(praticien.id),
            "jour": 2,
            "heure_debut": "09:00",
            "heure_fin": "12:00",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["jour_libelle"] == "Mercredi"
    assert data["plage"] == "09:00-12:00"


def test_horaire_avec_heures_inversees_refuse(admin_client: APIClient) -> None:
    praticien = PractitionerFactory()
    response = admin_client.post(
        reverse("horaire-list"),
        {
            "praticien": str(praticien.id),
            "jour": 2,
            "heure_debut": "13:00",
            "heure_fin": "09:00",
        },
    )
    assert response.status_code == 400
    assert "heure_fin" in response.json()["fields"]


def test_horaire_qui_chevauche_un_existant_refuse(admin_client: APIClient) -> None:
    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=1, heure_debut=time(9, 0), heure_fin=time(12, 0)
    )
    response = admin_client.post(
        reverse("horaire-list"),
        {
            "praticien": str(praticien.id),
            "jour": 1,
            "heure_debut": "11:00",
            "heure_fin": "14:00",
        },
    )
    assert response.status_code == 400
    assert "heure_debut" in response.json()["fields"]


def test_horaires_adjacents_autorises(admin_client: APIClient) -> None:
    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=1, heure_debut=time(9, 0), heure_fin=time(12, 0)
    )
    response = admin_client.post(
        reverse("horaire-list"),
        {
            "praticien": str(praticien.id),
            "jour": 1,
            "heure_debut": "12:00",
            "heure_fin": "14:00",
        },
    )
    assert response.status_code == 201


def test_patient_ne_peut_pas_creer_un_horaire(patient_client: APIClient) -> None:
    praticien = PractitionerFactory()
    response = patient_client.post(
        reverse("horaire-list"),
        {
            "praticien": str(praticien.id),
            "jour": 2,
            "heure_debut": "09:00",
            "heure_fin": "12:00",
        },
    )
    assert response.status_code == 403


def test_praticien_ne_peut_gerer_que_ses_horaires(
    as_dentist: tuple[APIClient, User],
) -> None:
    client, moi = as_dentist
    mon_profil = PractitionerFactory(user=moi)
    autre = PractitionerFactory()

    reponse = client.post(
        reverse("horaire-list"),
        {
            "praticien": str(mon_profil.id),
            "jour": 3,
            "heure_debut": "09:00",
            "heure_fin": "12:00",
        },
    )
    assert reponse.status_code == 201

    reponse = client.patch(
        reverse("horaire-detail", args=[reponse.json()["id"]]), {"actif": False}
    )
    assert reponse.status_code == 200

    reponse = client.post(
        reverse("horaire-list"),
        {
            "praticien": str(autre.id),
            "jour": 3,
            "heure_debut": "14:00",
            "heure_fin": "18:00",
        },
    )
    assert reponse.status_code == 403


def test_filtre_par_praticien_et_jour(patient_client: APIClient) -> None:
    praticien = PractitionerFactory()
    autre = PractitionerFactory()
    HoraireHebdomadaireFactory(praticien=praticien, jour=0)
    HoraireHebdomadaireFactory(praticien=praticien, jour=4)
    HoraireHebdomadaireFactory(praticien=autre, jour=0)

    url = reverse("horaire-list")
    assert len(patient_client.get(f"{url}?praticien={praticien.id}").json()) == 2
    assert len(patient_client.get(f"{url}?praticien={praticien.id}&jour=0").json()) == 1


# -------------------------------------------------------------------- exceptions


def test_admin_cree_une_exception_journee_entiere(admin_client: APIClient) -> None:
    praticien = PractitionerFactory()
    reponse = admin_client.post(
        reverse("exception-list"),
        {"praticien": str(praticien.id), "date": "2030-07-01", "motif": "Congé"},
    )
    assert reponse.status_code == 201
    assert reponse.json()["journee_entiere"] is True
    assert reponse.json()["type_libelle"] == "Congé"


def test_exception_avec_une_seule_heure_refusee(admin_client: APIClient) -> None:
    praticien = PractitionerFactory()
    reponse = admin_client.post(
        reverse("exception-list"),
        {
            "praticien": str(praticien.id),
            "date": "2030-07-01",
            "heure_debut": "09:00",
        },
    )
    assert reponse.status_code == 400
    assert "heure_debut" in reponse.json()["fields"]


def test_exception_avec_plage_horaire(admin_client: APIClient) -> None:
    praticien = PractitionerFactory()
    reponse = admin_client.post(
        reverse("exception-list"),
        {
            "praticien": str(praticien.id),
            "date": "2030-07-01",
            "type": "rdv_professionnel",
            "heure_debut": "09:00",
            "heure_fin": "11:00",
        },
    )
    assert reponse.status_code == 201
    assert reponse.json()["journee_entiere"] is False


def test_filtre_par_periode_et_type(patient_client: APIClient) -> None:
    ExceptionDisponibiliteFactory(date="2030-07-01", type="conge")
    ExceptionDisponibiliteFactory(date="2030-08-15", type="fermeture")
    url = reverse("exception-list")
    assert len(patient_client.get(f"{url}?date_min=2030-07-15").json()) == 1
    assert len(patient_client.get(f"{url}?type=conge").json()) == 1


def test_recherche_par_motif(patient_client: APIClient) -> None:
    ExceptionDisponibiliteFactory(motif="Mariage")
    ExceptionDisponibiliteFactory(motif="Formation continue")
    reponse = patient_client.get(f"{reverse('exception-list')}?search=mariage")
    assert len(reponse.json()) == 1


def test_patient_ne_peut_pas_creer_une_exception(patient_client: APIClient) -> None:
    praticien = PractitionerFactory()
    reponse = patient_client.post(
        reverse("exception-list"),
        {"praticien": str(praticien.id), "date": "2030-07-01"},
    )
    assert reponse.status_code == 403


# ------------------------------------------------------------------- créneaux


def test_creneaux_exigent_authentification(api_client: APIClient) -> None:
    assert api_client.get(reverse("creneaux")).status_code == 401


@freeze_time("2030-06-01 08:00:00+00:00")
def test_endpoint_creneaux(patient: tuple[APIClient, User]) -> None:
    client, _ = patient
    client.force_login(_)
    praticien = PractitionerFactory()
    soin = SoinFactory(duree_minutes=60)
    proposer_soin(praticien, soin)
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=0, heure_debut=time(9, 0), heure_fin=time(12, 0)
    )

    reponse = client.get(
        f"{reverse('creneaux')}?praticien={praticien.id}&soin={soin.id}"
        "&date_debut=2030-06-03&date_fin=2030-06-03"
    )
    assert reponse.status_code == 200
    donnees = reponse.json()
    assert [item["debut_local"][:16] for item in donnees] == [
        "2030-06-03T09:00",
        "2030-06-03T09:30",
        "2030-06-03T10:00",
        "2030-06-03T10:30",
        "2030-06-03T11:00",
    ]
    assert donnees[0]["duree_minutes"] == 60


@freeze_time("2030-06-01 08:00:00+00:00")
def test_creneaux_vides_sans_horaires(patient: tuple[APIClient, User]) -> None:
    client, _ = patient
    client.force_login(_)
    praticien = PractitionerFactory()
    soin = SoinFactory()
    proposer_soin(praticien, soin)
    reponse = client.get(
        f"{reverse('creneaux')}?praticien={praticien.id}&soin={soin.id}"
        "&date_debut=2030-06-03&date_fin=2030-06-10"
    )
    assert reponse.json() == []


@freeze_time("2030-06-01 08:00:00+00:00")
def test_creneaux_date_debut_dans_le_passee_refusee(
    patient: tuple[APIClient, User],
) -> None:
    client, _ = patient
    client.force_login(_)
    praticien = PractitionerFactory()
    soin = SoinFactory()
    proposer_soin(praticien, soin)
    reponse = client.get(
        f"{reverse('creneaux')}?praticien={praticien.id}&soin={soin.id}"
        "&date_debut=2029-01-01&date_fin=2029-01-02"
    )
    assert reponse.status_code == 400
    assert "date_debut" in reponse.json()["fields"]


@freeze_time("2030-06-01 08:00:00+00:00")
def test_creneaux_periode_trop_longue_refusee(patient: tuple[APIClient, User]) -> None:
    client, _ = patient
    client.force_login(_)
    praticien = PractitionerFactory()
    soin = SoinFactory()
    proposer_soin(praticien, soin)
    reponse = client.get(
        f"{reverse('creneaux')}?praticien={praticien.id}&soin={soin.id}"
        "&date_debut=2030-06-03&date_fin=2030-12-31"
    )
    assert reponse.status_code == 400
    assert "date_fin" in reponse.json()["fields"]


def test_creneaux_parametres_obligatoires(patient_client: APIClient) -> None:
    reponse = patient_client.get(reverse("creneaux"))
    assert reponse.status_code == 400
    assert set(reponse.json()["fields"]) == {"praticien", "soin"}


def test_creneaux_praticien_inconnu(patient_client: APIClient) -> None:
    soin = SoinFactory()
    reponse = patient_client.get(
        f"{reverse('creneaux')}?praticien="
        f"00000000-0000-0000-0000-000000000000&soin={soin.id}"
    )
    assert reponse.status_code == 400


def test_horaires_et_exceptions_sont_bien_supprimes_par_admin(
    admin_client: APIClient,
) -> None:
    horaire = HoraireHebdomadaireFactory()
    exception = ExceptionDisponibiliteFactory()
    assert (
        admin_client.delete(reverse("horaire-detail", args=[horaire.id])).status_code
        == 204
    )
    assert (
        admin_client.delete(
            reverse("exception-detail", args=[exception.id])
        ).status_code
        == 204
    )
    assert not HoraireHebdomadaire.objects.filter(pk=horaire.pk).exists()
    assert not ExceptionDisponibilite.objects.filter(pk=exception.pk).exists()
