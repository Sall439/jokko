import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import (
    AdminFactory,
    DentistFactory,
    PatientFactory,
)
from apps.catalog.tests.factories import SoinFactory
from apps.practitioners.services import proposer_soin
from apps.practitioners.tests.factories import (
    CabinetFactory,
    PractitionerFactory,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_client(api_client: APIClient) -> APIClient:
    api_client.force_login(AdminFactory())
    return api_client


@pytest.fixture
def as_dentist(api_client: APIClient) -> tuple[APIClient, User]:
    """Client connecté en tant que praticien + l'utilisateur correspondant."""
    user = DentistFactory()
    api_client.force_login(user)
    return api_client, user


@pytest.fixture
def patient_client(api_client: APIClient) -> APIClient:
    api_client.force_login(PatientFactory())
    return api_client


# -------------------------------------------------------------- authentification


def test_liste_praticiens_exige_authentification(api_client: APIClient) -> None:
    assert api_client.get(reverse("praticien-list")).status_code == 401


def test_patient_peut_lister_les_praticiens(patient_client: APIClient) -> None:
    PractitionerFactory()
    response = patient_client.get(reverse("praticien-list"))
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1


# -------------------------------------------------------------------------- detail


def test_detail_praticien_inclut_soins(patient_client: APIClient) -> None:
    praticien = PractitionerFactory()
    propose = SoinFactory(nom="Detartrage")
    autre = SoinFactory(nom="Extraction")
    proposer_soin(praticien, propose)

    response = patient_client.get(reverse("praticien-detail", args=[praticien.id]))
    assert response.status_code == 200
    data = response.json()
    assert data["nom"] == praticien.user.nom
    assert [item["nom"] for item in data["soins"]] == ["Detartrage"]
    assert autre.nom not in [item["nom"] for item in data["soins"]]


def test_detail_404(patient_client: APIClient) -> None:
    response = patient_client.get(
        reverse("praticien-detail", args=["00000000-0000-0000-0000-000000000000"])
    )
    assert response.status_code == 404


# --------------------------------------------------------------------- permissions


def test_patient_ne_peut_pas_creer_de_praticien(patient_client: APIClient) -> None:
    user = DentistFactory()
    response = patient_client.post(reverse("praticien-list"), {"user": str(user.id)})
    assert response.status_code == 403


def test_admin_peut_creer_un_praticien(admin_client: APIClient) -> None:
    user = DentistFactory()
    cabinet = CabinetFactory()
    response = admin_client.post(
        reverse("praticien-list"),
        {"user": str(user.id), "cabinet": str(cabinet.id)},
    )
    assert response.status_code == 201
    assert response.json()["cabinet"] == str(cabinet.id)


def test_creation_refusee_si_utilisateur_non_dentiste(
    admin_client: APIClient,
) -> None:
    user = PatientFactory()
    response = admin_client.post(reverse("praticien-list"), {"user": str(user.id)})
    assert response.status_code == 400
    assert "user" in response.json()["fields"]


def test_creation_refusee_si_profil_deja_existant(admin_client: APIClient) -> None:
    user = DentistFactory()
    PractitionerFactory(user=user)
    response = admin_client.post(reverse("praticien-list"), {"user": str(user.id)})
    assert response.status_code == 400
    assert "user" in response.json()["fields"]


def test_praticien_ne_peut_modifier_que_son_profil(
    as_dentist: tuple[APIClient, User],
) -> None:
    client, moi = as_dentist
    autre = PractitionerFactory()
    mon_profil = PractitionerFactory(user=moi)

    response = client.patch(
        reverse("praticien-detail", args=[autre.id]), {"annees_experience": 9}
    )
    assert response.status_code == 403

    response = client.patch(
        reverse("praticien-detail", args=[mon_profil.id]), {"annees_experience": 9}
    )
    assert response.status_code == 200
    assert response.json()["annees_experience"] == 9


def test_praticien_ne_peut_pas_supprimer_de_profil(
    as_dentist: tuple[APIClient, User],
) -> None:
    client, moi = as_dentist
    mon_profil = PractitionerFactory(user=moi)
    assert (
        client.delete(reverse("praticien-detail", args=[mon_profil.id])).status_code
        == 403
    )


def test_admin_peut_supprimer_un_praticien_sans_rdv(admin_client: APIClient) -> None:
    praticien = PractitionerFactory()
    response = admin_client.delete(reverse("praticien-detail", args=[praticien.id]))
    assert response.status_code == 204


# --------------------------------------------------------------------- endpoint moi


def test_moi_sans_profil_retourne_une_erreur_claire(
    as_dentist: tuple[APIClient, User],
) -> None:
    client, _ = as_dentist
    response = client.get(reverse("praticien-moi"))
    assert response.status_code == 400
    assert response.json()["message"] == "Aucun profil praticien ne vous est rattaché."


def test_moi_retourne_le_profil_du_praticien(
    as_dentist: tuple[APIClient, User],
) -> None:
    client, moi = as_dentist
    profil = PractitionerFactory(user=moi)
    response = client.get(reverse("praticien-moi"))
    assert response.status_code == 200
    assert response.json()["id"] == str(profil.id)


def test_moi_pour_un_patient_renseigne_une_erreur(patient_client: APIClient) -> None:
    response = patient_client.get(reverse("praticien-moi"))
    assert response.status_code == 400


def test_selecteurs_ignorent_les_praticiens_inactifs() -> None:
    """`only_active=True` filtre praticien *et* utilisateur désactivés."""
    from apps.practitioners.selectors import (
        get_practitioner_for_user,
        get_practitioners,
    )

    actif = PractitionerFactory()
    inactif = PractitionerFactory(actif=False)
    desactive = PractitionerFactory()
    desactive.user.is_active = False
    desactive.user.save(update_fields=["is_active"])

    visibles = set(get_practitioners().values_list("id", flat=True))
    assert str(actif.id) in {str(v) for v in visibles}
    assert str(inactif.id) not in {str(v) for v in visibles}
    assert str(desactive.id) not in {str(v) for v in visibles}

    # `only_active=False` les retrouve, et le sélecteur par utilisateur
    # accepte l'absence d'identifiant sans planter.
    assert get_practitioner_for_user(None) is None
    assert get_practitioner_for_user(inactif.user_id) is not None


# -------------------------------------------------------------------- soins lies


def test_endpoint_soins_proposes(patient_client: APIClient) -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    url = reverse("praticien-soins", args=[praticien.id])

    assert patient_client.get(url).json() == []

    proposer_soin(praticien, soin)
    assert [item["nom"] for item in patient_client.get(url).json()] == [soin.nom]


def test_ajout_soin_propose_refuse_aux_patients(patient_client: APIClient) -> None:
    praticien = PractitionerFactory()
    soin = SoinFactory()
    response = patient_client.post(
        reverse("praticien-soins-proposes", args=[praticien.id]),
        {"soin": str(soin.id)},
    )
    assert response.status_code == 403


def test_ajout_et_retrait_soin_propose_par_le_praticien(
    as_dentist: tuple[APIClient, User],
) -> None:
    client, moi = as_dentist
    profil = PractitionerFactory(user=moi)
    soin = SoinFactory()
    url = reverse("praticien-soins-proposes", args=[profil.id])

    response = client.post(url, {"soin": str(soin.id), "prix_xof": 13000})
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["tarif_effectif"] == 13000

    response = client.delete(url, {"soin": str(soin.id)})
    assert response.status_code == 200
    assert response.json() == []


def test_ajout_soin_propose_prix_invalide(as_dentist: tuple[APIClient, User]) -> None:
    client, moi = as_dentist
    profil = PractitionerFactory(user=moi)
    soin = SoinFactory()
    response = client.post(
        reverse("praticien-soins-proposes", args=[profil.id]),
        {"soin": str(soin.id), "prix_xof": "gratuit"},
    )
    assert response.status_code == 400
    assert "Prix invalide" in str(response.json()["fields"])


def test_ajout_soin_propose_inconnu(as_dentist: tuple[APIClient, User]) -> None:
    client, moi = as_dentist
    profil = PractitionerFactory(user=moi)
    response = client.post(
        reverse("praticien-soins-proposes", args=[profil.id]),
        {"soin": "00000000-0000-0000-0000-000000000000"},
    )
    assert response.status_code == 404


def test_praticien_ne_peut_pas_gerer_les_soins_d_un_autre(
    as_dentist: tuple[APIClient, User],
) -> None:
    client, _ = as_dentist
    autre = PractitionerFactory()
    soin = SoinFactory()
    response = client.post(
        reverse("praticien-soins-proposes", args=[autre.id]),
        {"soin": str(soin.id)},
    )
    assert response.status_code == 403


# ------------------------------------------------------ specialites / cabinets


def test_specialites_crud(admin_client: APIClient) -> None:
    response = admin_client.post(reverse("specialite-list"), {"nom": "Endodontie"})
    assert response.status_code == 201
    specialite_id = response.json()["id"]

    response = admin_client.patch(
        reverse("specialite-detail", args=[specialite_id]),
        {"description": "Traitement des canaux"},
    )
    assert response.status_code == 200

    response = admin_client.delete(reverse("specialite-detail", args=[specialite_id]))
    assert response.status_code == 204


def test_cabinet_inclut_nb_praticiens(admin_client: APIClient) -> None:
    cabinet = CabinetFactory()
    PractitionerFactory(cabinet=cabinet)
    PractitionerFactory()
    response = admin_client.get(reverse("cabinet-detail", args=[cabinet.id]))
    assert response.json()["nb_praticiens"] == 1


def test_cabinet_adresse_obligatoire(admin_client: APIClient) -> None:
    response = admin_client.post(
        reverse("cabinet-list"), {"nom": "Sans adresse", "adresse": "  "}
    )
    assert response.status_code == 400
    assert "adresse" in response.json()["fields"]


# --------------------------------------------------------------------- filtres


def test_filtre_par_cabinet_et_recherche(patient_client: APIClient) -> None:
    cabinet = CabinetFactory(nom="Clinique Nord")
    dans_cabinet = PractitionerFactory(cabinet=cabinet)
    searching = PractitionerFactory()
    searching.user.nom = "Ndiaye"
    searching.user.save()

    response = patient_client.get(f"{reverse('praticien-list')}?cabinet={cabinet.id}")
    assert [item["id"] for item in response.json()["data"]] == [str(dans_cabinet.id)]

    response = patient_client.get(f"{reverse('praticien-list')}?search=ndiaye")
    assert [item["id"] for item in response.json()["data"]] == [str(searching.id)]


def test_tri_par_nom(admin_client: APIClient) -> None:
    bas = DentistFactory(nom="Aida")
    haut = DentistFactory(nom="Zacharie")
    PractitionerFactory(user=bas)
    PractitionerFactory(user=haut)

    response = admin_client.get(f"{reverse('praticien-list')}?ordering=user__nom")
    noms = [item["nom"] for item in response.json()["data"]]
    assert noms == ["Aida", "Zacharie"]
