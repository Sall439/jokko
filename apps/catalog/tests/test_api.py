import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import AdminFactory, PatientFactory
from apps.catalog.tests.factories import CategorieSoinFactory, SoinFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_client(api_client: APIClient) -> APIClient:
    api_client.force_login(AdminFactory())
    return api_client


@pytest.fixture
def patient_client(api_client: APIClient) -> APIClient:
    api_client.force_login(PatientFactory())
    return api_client


# ---------------------------------------------------------------- authentification


def test_liste_soins_exige_authentification(api_client: APIClient) -> None:
    response = api_client.get(reverse("soin-list"))
    assert response.status_code == 401


def test_patient_peut_lire_le_catalogue(patient_client: APIClient) -> None:
    soin = SoinFactory(nom="Détartrage")
    response = patient_client.get(reverse("soin-list"))
    assert response.status_code == 200
    noms = [item["nom"] for item in response.json()["data"]]
    assert "Détartrage" in noms
    assert str(soin.id) in [item["id"] for item in response.json()["data"]]


# ------------------------------------------------------------------- permissions


def test_patient_ne_peut_pas_creer_un_soin(patient_client: APIClient) -> None:
    categorie = CategorieSoinFactory()
    response = patient_client.post(
        reverse("soin-list"),
        {
            "nom": "Extraction",
            "duree_minutes": 30,
            "prix_xof": 20000,
            "categorie": str(categorie.id),
        },
    )
    assert response.status_code == 403


def test_admin_peut_creer_un_soin(admin_client: APIClient) -> None:
    categorie = CategorieSoinFactory()
    response = admin_client.post(
        reverse("soin-list"),
        {
            "nom": "Extraction",
            "description": "Chirurgie",
            "duree_minutes": 45,
            "prix_xof": 25000,
            "categorie": str(categorie.id),
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nom"] == "Extraction"
    assert data["prix_xof"] == 25000
    assert data["categorie_nom"] == categorie.nom


def test_creation_refusee_si_duree_invalide(admin_client: APIClient) -> None:
    categorie = CategorieSoinFactory()
    response = admin_client.post(
        reverse("soin-list"),
        {
            "nom": "Soin trop court",
            "duree_minutes": 1,
            "prix_xof": 5000,
            "categorie": str(categorie.id),
        },
    )
    assert response.status_code == 400
    assert "duree_minutes" in response.json()["fields"]


def test_detail_404(admin_client: APIClient) -> None:
    response = admin_client.get(
        reverse("soin-detail", args=["00000000-0000-0000-0000-000000000000"])
    )
    assert response.status_code == 404


def test_creation_refusee_si_duree_trop_longue(admin_client: APIClient) -> None:
    categorie = CategorieSoinFactory()
    response = admin_client.post(
        reverse("soin-list"),
        {
            "nom": "Soin interminable",
            "duree_minutes": 601,
            "prix_xof": 5000,
            "categorie": str(categorie.id),
        },
    )
    assert response.status_code == 400
    assert "duree_minutes" in response.json()["fields"]


def test_creation_refusee_si_prix_negatif(admin_client: APIClient) -> None:
    categorie = CategorieSoinFactory()
    response = admin_client.post(
        reverse("soin-list"),
        {
            "nom": "Soin offert",
            "duree_minutes": 30,
            "prix_xof": -1,
            "categorie": str(categorie.id),
        },
    )
    assert response.status_code == 400
    assert "prix_xof" in response.json()["fields"]


def test_creation_refusee_si_nom_vide(admin_client: APIClient) -> None:
    categorie = CategorieSoinFactory()
    response = admin_client.post(
        reverse("soin-list"),
        {
            "nom": "   ",
            "duree_minutes": 30,
            "prix_xof": 5000,
            "categorie": str(categorie.id),
        },
    )
    assert response.status_code == 400
    assert "nom" in response.json()["fields"]


def test_messages_d_erreur_en_francais(admin_client: APIClient) -> None:
    """Les bornes et unicité sont signalées en français, pas en anglais."""
    categorie = CategorieSoinFactory(nom="Chirurgie")
    trop_court = admin_client.post(
        reverse("soin-list"),
        {
            "nom": "Soin",
            "duree_minutes": 1,
            "prix_xof": 5000,
            "categorie": str(categorie.id),
        },
    )
    assert trop_court.status_code == 400
    assert "au moins 5 minutes" in trop_court.json()["fields"]["duree_minutes"][0]

    trop_long = admin_client.post(
        reverse("soin-list"),
        {
            "nom": "Soin",
            "duree_minutes": 601,
            "prix_xof": 5000,
            "categorie": str(categorie.id),
        },
    )
    assert "600 minutes" in trop_long.json()["fields"]["duree_minutes"][0]

    prix_negatif = admin_client.post(
        reverse("soin-list"),
        {
            "nom": "Soin",
            "duree_minutes": 30,
            "prix_xof": -5,
            "categorie": str(categorie.id),
        },
    )
    assert "négatif" in prix_negatif.json()["fields"]["prix_xof"][0]

    # Le nom d'une catégorie reste unique, avec un message explicite.
    doublon = admin_client.post(
        reverse("categorie-soin-list"), {"nom": "Chirurgie"}
    )
    assert doublon.status_code == 400
    assert "existe déjà" in doublon.json()["fields"]["nom"][0]


# ---------------------------------------------------------------------- filtres


def test_filtre_par_categorie_et_actif(admin_client: APIClient) -> None:
    chirurgie = CategorieSoinFactory(nom="Chirurgie")
    prevention = CategorieSoinFactory(nom="Prévention")
    actif = SoinFactory(nom="Actif", categorie=chirurgie)
    inactif = SoinFactory(nom="Inactif", categorie=prevention, actif=False)

    response = admin_client.get(f"{reverse('soin-list')}?actif=true")
    ids = [item["id"] for item in response.json()["data"]]
    assert str(actif.id) in ids
    assert str(inactif.id) not in ids

    response = admin_client.get(
        f"{reverse('soin-list')}?categorie={prevention.id}&actif=false"
    )
    ids = [item["id"] for item in response.json()["data"]]
    assert ids == [str(inactif.id)]


def test_recherche_plein_texte(admin_client: APIClient) -> None:
    SoinFactory(nom="Obturation")
    SoinFactory(nom="Detartrage")
    response = admin_client.get(f"{reverse('soin-list')}?search=obtura")
    noms = [item["nom"] for item in response.json()["data"]]
    assert noms == ["Obturation"]


def test_tri_par_prix(admin_client: APIClient) -> None:
    SoinFactory(nom="Cher", prix_xof=90000)
    SoinFactory(nom="Pas cher", prix_xof=5000)
    response = admin_client.get(f"{reverse('soin-list')}?ordering=prix_xof")
    noms = [item["nom"] for item in response.json()["data"]]
    assert noms == ["Pas cher", "Cher"]


def test_pagination(admin_client: APIClient) -> None:
    for index in range(25):
        SoinFactory(nom=f"Soin {index:02d}")
    response = admin_client.get(f"{reverse('soin-list')}?pageSize=10")
    payload = response.json()
    assert payload["meta"]["total"] == 25
    assert payload["meta"]["pageSize"] == 10
    assert len(payload["data"]) == 10


# --------------------------------------------------------------------- actions


def test_desactiver_puis_reactiver_un_soin(admin_client: APIClient) -> None:
    soin = SoinFactory(actif=True)

    response = admin_client.post(reverse("soin-desactiver", args=[soin.id]))
    assert response.status_code == 200
    assert response.json()["actif"] is False

    soin.refresh_from_db()
    assert soin.actif is False

    response = admin_client.post(reverse("soin-activer", args=[soin.id]))
    assert response.status_code == 200
    soin.refresh_from_db()
    assert soin.actif is True


def test_delete_desactive_le_soin(admin_client: APIClient) -> None:
    soin = SoinFactory(actif=True)
    response = admin_client.delete(reverse("soin-detail", args=[soin.id]))
    assert response.status_code == 204
    soin.refresh_from_db()
    assert soin.actif is False


def test_patient_ne_peut_pas_desactiver(patient_client: APIClient) -> None:
    soin = SoinFactory(actif=True)
    response = patient_client.post(reverse("soin-desactiver", args=[soin.id]))
    assert response.status_code == 403


# ------------------------------------------------------------------- catégories


def test_categories_crud_par_admin(admin_client: APIClient) -> None:
    response = admin_client.post(reverse("categorie-soin-list"), {"nom": "Chirurgie"})
    assert response.status_code == 201

    categorie_id = response.json()["id"]
    response = admin_client.get(reverse("categorie-soin-detail", args=[categorie_id]))
    assert response.status_code == 200
    assert response.json()["nom"] == "Chirurgie"

    response = admin_client.patch(
        reverse("categorie-soin-detail", args=[categorie_id]), {"ordre": 3}
    )
    assert response.status_code == 200
    assert response.json()["ordre"] == 3

    response = admin_client.delete(
        reverse("categorie-soin-detail", args=[categorie_id])
    )
    assert response.status_code == 204


def test_patient_ne_peut_pas_creer_de_categorie(patient_client: APIClient) -> None:
    response = patient_client.post(reverse("categorie-soin-list"), {"nom": "Interdite"})
    assert response.status_code == 403
