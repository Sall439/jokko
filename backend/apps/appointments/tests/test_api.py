"""Tests des endpoints de l'app `appointments`."""

from datetime import date, time, timedelta
from typing import Any

import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import AdminFactory, DentistFactory, PatientFactory
from apps.appointments.models import Appointment
from apps.appointments.tests.factories import AppointmentFactory
from apps.availability.tests.factories import (
    ExceptionDisponibiliteFactory,
    HoraireHebdomadaireFactory,
)
from apps.catalog.tests.factories import SoinFactory
from apps.core.utils import combine_local
from apps.practitioners.services import proposer_soin
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db

INSTANT = "2030-06-01 07:00:00+00:00"
LUNDI = date(2030, 6, 3)

LISTE = "rendez-vous-list"


@pytest.fixture
def plateau() -> tuple[Any, Any]:
    """Praticien ouvert le lundi 09h-13h + soin de 60 min proposé."""
    praticien = PractitionerFactory()
    HoraireHebdomadaireFactory(
        praticien=praticien, jour=0, heure_debut=time(9, 0), heure_fin=time(13, 0)
    )
    soin = SoinFactory(duree_minutes=60)
    proposer_soin(praticien, soin)
    return praticien, soin


def _reserver(client: APIClient, profil: Any, soin: Any, heure: str = "09:00") -> Any:
    h, m = (int(part) for part in heure.split(":"))
    reponse = client.post(
        reverse(LISTE),
        {
            "praticien": str(profil.id),
            "soin": str(soin.id),
            "debut": combine_local(LUNDI, time(h, m)).isoformat(),
        },
    )
    assert reponse.status_code == 201, reponse.content
    return reponse.json()


# ------------------------------------------------------------------- écriture


@freeze_time(INSTANT)
def test_seul_un_patient_peut_reserver(
    api_client: APIClient, plateau: tuple[Any, Any]
) -> None:
    """Un praticien ne réserve pas « pour lui » (le patient est déduit)."""
    praticien, soin = plateau
    dentiste = DentistFactory()
    api_client.force_login(dentiste)

    reponse = api_client.post(
        reverse(LISTE),
        {
            "praticien": str(praticien.id),
            "soin": str(soin.id),
            "debut": combine_local(LUNDI, time(9, 0)).isoformat(),
        },
    )
    assert reponse.status_code == 403
    assert reponse.json()["message"]
    assert not Appointment.objects.exists()


@freeze_time(INSTANT)
def test_permission_objet_refuse_un_objet_etranger() -> None:
    """`CanReadAppointment` refuse tout objet qui n'est pas un rendez-vous."""
    from apps.appointments.permissions import CanReadAppointment, IsPatientBooking

    class Requete:
        method = "GET"

        class user:  # noqa: N801 - fausse classe utilisateur
            id = None
            is_authenticated = True
            role = "dentiste"

    permission = CanReadAppointment()
    assert not permission.has_object_permission(Requete(), None, object())

    # Un utilisateur non authentifié n'a aucune permission, même en lecture.
    class Anonyme(Requete):
        class user:  # noqa: N801
            is_authenticated = False

    assert not IsPatientBooking().has_permission(Anonyme(), None)

    # Un non-patient n'a pas le droit de réserver (méthode non sûre).
    class Ecriture(Requete):
        method = "POST"

    assert not IsPatientBooking().has_permission(Ecriture(), None)
    # …mais il peut lire et annuler son propre agenda.
    assert IsPatientBooking().has_permission(Requete(), None)


# --------------------------------------------------------------------- lecture


def test_liste_exige_authentification(api_client: APIClient) -> None:
    assert api_client.get(reverse(LISTE)).status_code == 401


def test_patient_ne_voit_que_ses_rendez_vous(
    api_client: APIClient, patient_user: User, other_patient_user: User
) -> None:
    mien = AppointmentFactory(patient=patient_user)
    AppointmentFactory(patient=other_patient_user)

    api_client.force_login(patient_user)
    reponse = api_client.get(reverse(LISTE))
    assert reponse.status_code == 200
    donnees = reponse.json()["data"]
    assert [item["id"] for item in donnees] == [str(mien.id)]


def test_praticien_ne_voit_que_son_agenda(
    api_client: APIClient, dentist_user: User
) -> None:
    mon_profil = PractitionerFactory(user=dentist_user)
    AppointmentFactory(praticien=mon_profil)
    AppointmentFactory(praticien=PractitionerFactory())

    api_client.force_login(dentist_user)
    donnees = api_client.get(reverse(LISTE)).json()["data"]
    assert len(donnees) == 1


def test_admin_voit_tous_les_rendez_vous(api_client: APIClient) -> None:
    AppointmentFactory()
    AppointmentFactory()
    api_client.force_login(AdminFactory())
    donnees = api_client.get(reverse(LISTE)).json()["data"]
    assert len(donnees) == 2


def test_detail_d_un_rendez_vous_qui_ne_concerne_pas(api_client: APIClient) -> None:
    rdv = AppointmentFactory()
    api_client.force_login(PatientFactory())
    reponse = api_client.get(reverse("rendez-vous-detail", args=[rdv.id]))
    # Le queryset est déjà filtré : DRF répond 404 (le RDV n'existe pas *pour* lui).
    assert reponse.status_code == 404


def test_detail_inconnu(api_client: APIClient) -> None:
    api_client.force_login(AdminFactory())
    reponse = api_client.get(
        reverse("rendez-vous-detail", args=["00000000-0000-0000-0000-000000000000"])
    )
    assert reponse.status_code == 404


def test_pagination_et_meta(api_client: APIClient) -> None:
    from apps.core.pagination import StandardPagination

    AppointmentFactory()
    api_client.force_login(AdminFactory())
    corps = api_client.get(reverse(LISTE)).json()
    assert set(corps) == {"data", "meta"}
    assert corps["meta"]["total"] == 1
    assert corps["meta"]["pageSize"] == StandardPagination.page_size


def test_filtre_par_statut_et_soin(api_client: APIClient) -> None:
    from apps.appointments.tests.factories import AppointmentConfirmeFactory

    soin_a = SoinFactory()
    soin_b = SoinFactory()
    AppointmentFactory(soin=soin_a)
    AppointmentConfirmeFactory(soin=soin_b)

    api_client.force_login(AdminFactory())
    url = reverse(LISTE)
    assert len(api_client.get(f"{url}?statut=confirmed").json()["data"]) == 1
    assert len(api_client.get(f"{url}?soin={soin_a.id}").json()["data"]) == 1
    assert len(api_client.get(f"{url}?statut=pending").json()["data"]) == 1


def test_filtre_par_periode(api_client: APIClient) -> None:
    AppointmentFactory(debut=combine_local(LUNDI, time(9, 0)))
    AppointmentFactory(debut=combine_local(LUNDI + timedelta(days=40), time(9, 0)))

    api_client.force_login(AdminFactory())
    url = reverse(LISTE)
    assert len(api_client.get(f"{url}?date_min=2030-01-01").json()["data"]) == 2
    assert len(api_client.get(f"{url}?date_max=2030-01-01").json()["data"]) == 0
    assert (
        len(
            api_client.get(f"{url}?date_min=2030-07-01&date_max=2030-12-31").json()[
                "data"
            ]
        )
        == 1
    )


def test_recherche_et_tri(api_client: APIClient) -> None:
    cible = AppointmentFactory()
    AppointmentFactory()
    admin = AdminFactory(nom="Recherche", prenom="Unique")
    cible.patient = admin
    cible.save()

    api_client.force_login(AdminFactory())
    url = reverse(LISTE)
    assert len(api_client.get(f"{url}?search=unique").json()["data"]) == 1
    tri = api_client.get(f"{url}?ordering=debut").json()["data"]
    assert len(tri) == 2


def test_endpoint_avenir(api_client: APIClient) -> None:
    """Prochains rendez-vous du patient connecté, du plus proche au plus lointain."""
    lointain = AppointmentFactory(
        debut=combine_local(LUNDI, time(11, 0)),
        fin=combine_local(LUNDI, time(11, 30)),
    )
    proche = AppointmentFactory(
        debut=combine_local(LUNDI, time(9, 0)), fin=combine_local(LUNDI, time(9, 30))
    )
    AppointmentFactory(
        debut=combine_local(date(2030, 1, 6), time(9, 0)),
        fin=combine_local(date(2030, 1, 6), time(9, 30)),
    )

    api_client.force_login(proche.patient)
    reponse = api_client.get(f"{reverse('rendez-vous-avenir')}?limite=1")
    assert reponse.status_code == 200
    assert [item["id"] for item in reponse.json()] == [str(proche.id)]
    assert lointain.pk is not None


# -------------------------------------------------------------------- création


@freeze_time(INSTANT)
def test_reservation_par_le_patient(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())

    corps = _reserver(api_client, profil, soin)
    assert corps["statut"] == "pending"
    assert corps["duree_minutes"] == 60
    assert corps["soin_nom"] == soin.nom
    assert corps["praticien_nom"] == str(profil)
    assert corps["debut_local"].startswith("2030-06-03T09:00")
    assert corps["transitions_possibles"] == ["confirmed", "cancelled", "no_show"]
    assert corps["peut_annuler"] is True
    assert Appointment.objects.count() == 1


@freeze_time(INSTANT)
def test_reservation_exige_authentification(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    reponse = api_client.post(
        reverse(LISTE),
        {
            "praticien": str(profil.id),
            "soin": str(soin.id),
            "debut": "2030-06-03T09:00:00Z",
        },
    )
    assert reponse.status_code == 401


@freeze_time(INSTANT)
def test_reservation_creneau_occupe_refuse(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    _reserver(api_client, profil, soin)
    reponse = api_client.post(
        reverse(LISTE),
        {
            "praticien": str(profil.id),
            "soin": str(soin.id),
            "debut": combine_local(LUNDI, time(9, 0)).isoformat(),
        },
    )
    assert reponse.status_code == 400
    assert "debut" in reponse.json()["fields"]


@freeze_time(INSTANT)
def test_reservation_dans_le_passe_refusee(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    reponse = api_client.post(
        reverse(LISTE),
        {
            "praticien": str(profil.id),
            "soin": str(soin.id),
            "debut": "2029-01-08T09:00:00Z",
        },
    )
    assert reponse.status_code == 400
    assert "passé" in str(reponse.json()["fields"]["debut"])


@freeze_time(INSTANT)
def test_reservation_hors_horaires_refusee(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    reponse = api_client.post(
        reverse(LISTE),
        {
            "praticien": str(profil.id),
            "soin": str(soin.id),
            "debut": combine_local(LUNDI, time(22, 0)).isoformat(),
        },
    )
    assert reponse.status_code == 400


@freeze_time(INSTANT)
def test_reservation_pendant_un_conge_refusee(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    ExceptionDisponibiliteFactory(praticien=profil, date=LUNDI, motif="Congé")
    api_client.force_login(PatientFactory())
    reponse = api_client.post(
        reverse(LISTE),
        {
            "praticien": str(profil.id),
            "soin": str(soin.id),
            "debut": combine_local(LUNDI, time(9, 0)).isoformat(),
        },
    )
    assert reponse.status_code == 400


@freeze_time(INSTANT)
def test_reservation_soin_non_propose_refusee(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, _ = plateau
    autre_soin = SoinFactory()
    api_client.force_login(PatientFactory())
    reponse = api_client.post(
        reverse(LISTE),
        {
            "praticien": str(profil.id),
            "soin": str(autre_soin.id),
            "debut": combine_local(LUNDI, time(9, 0)).isoformat(),
        },
    )
    assert reponse.status_code == 400
    assert "ne propose pas" in str(reponse.json()["fields"]["debut"])


@freeze_time(INSTANT)
def test_reservation_champs_manquants(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    reponse = api_client.post(reverse(LISTE), {"soin": str(soin.id)})
    assert reponse.status_code == 400
    assert set(reponse.json()["fields"]) >= {"praticien", "debut"}


@freeze_time(INSTANT)
def test_reservation_praticien_inconnu(api_client: APIClient, plateau: tuple) -> None:
    _, soin = plateau
    api_client.force_login(PatientFactory())
    reponse = api_client.post(
        reverse(LISTE),
        {
            "praticien": "00000000-0000-0000-0000-000000000000",
            "soin": str(soin.id),
            "debut": combine_local(LUNDI, time(9, 0)).isoformat(),
        },
    )
    assert reponse.status_code == 400


# ------------------------------------------------------------------- actions


@freeze_time(INSTANT)
def test_confirmation_par_le_praticien(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)
    api_client.force_login(profil.user)

    reponse = api_client.post(reverse("rendez-vous-confirmer", args=[corps["id"]]), {})
    assert reponse.status_code == 200
    assert reponse.json()["statut"] == "confirmed"
    assert reponse.json()["confirme_le"] is not None


@freeze_time(INSTANT)
def test_confirmation_par_un_autre_praticien_refusee(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)
    api_client.force_login(DentistFactory())

    reponse = api_client.post(reverse("rendez-vous-confirmer", args=[corps["id"]]), {})
    assert reponse.status_code == 404


@freeze_time(INSTANT)
def test_confirmation_par_le_patient_refusee(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)

    reponse = api_client.post(reverse("rendez-vous-confirmer", args=[corps["id"]]), {})
    assert reponse.status_code == 403


def test_confirmation_par_un_patient_expose_403_pour_un_admin(
    api_client: APIClient,
) -> None:
    rdv = AppointmentFactory()
    api_client.force_login(rdv.patient)
    reponse = api_client.post(reverse("rendez-vous-confirmer", args=[rdv.id]), {})
    assert reponse.status_code == 403


@freeze_time(INSTANT)
def test_cycle_confirmer_terminer(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)
    api_client.force_login(profil.user)

    api_client.post(reverse("rendez-vous-confirmer", args=[corps["id"]]), {})
    reponse = api_client.post(reverse("rendez-vous-terminer", args=[corps["id"]]), {})
    assert reponse.status_code == 200
    assert reponse.json()["statut"] == "completed"


@freeze_time(INSTANT)
def test_marquer_absent(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)
    api_client.force_login(profil.user)
    reponse = api_client.post(reverse("rendez-vous-absent", args=[corps["id"]]), {})
    assert reponse.status_code == 200
    assert reponse.json()["statut"] == "no_show"


@freeze_time(INSTANT)
def test_terminer_sans_confirmer_refuse(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)
    api_client.force_login(profil.user)
    reponse = api_client.post(reverse("rendez-vous-terminer", args=[corps["id"]]), {})
    assert reponse.status_code == 400


# ---------------------------------------------------------------- annulation


@freeze_time(INSTANT)
def test_annulation_par_le_patient_avec_motif(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)

    reponse = api_client.post(
        reverse("rendez-vous-annuler", args=[corps["id"]]), {"motif": "Empêchement"}
    )
    assert reponse.status_code == 200
    assert reponse.json()["statut"] == "cancelled"
    assert reponse.json()["motif_annulation"] == "Empêchement"
    # Le rendez-vous existe toujours : jamais de suppression physique.
    assert Appointment.objects.filter(pk=corps["id"]).exists()


@freeze_time(INSTANT)
def test_annulation_sans_motif_refusee(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)

    reponse = api_client.post(reverse("rendez-vous-annuler", args=[corps["id"]]), {})
    assert reponse.status_code == 400
    assert "motif" in reponse.json()["fields"]


@freeze_time(INSTANT)
def test_annulation_hors_fenetre_refusee_pour_le_patient(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)

    # 2 h avant le rendez-vous : la fenêtre de 24 h est fermée.
    with freeze_time(combine_local(LUNDI, time(9, 0)) - timedelta(hours=2)):
        reponse = api_client.post(
            reverse("rendez-vous-annuler", args=[corps["id"]]), {"motif": "Trop tard"}
        )
    assert reponse.status_code == 400
    assert "24 heures" in str(reponse.json()["fields"]["motif"])


@freeze_time(INSTANT)
def test_annulation_par_admin_ignore_la_fenetre(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)

    with freeze_time(combine_local(LUNDI, time(9, 0)) - timedelta(hours=2)):
        api_client.force_login(AdminFactory())
        reponse = api_client.post(
            reverse("rendez-vous-annuler", args=[corps["id"]]), {"motif": "Urgence"}
        )
    assert reponse.status_code == 200
    assert reponse.json()["statut"] == "cancelled"


@freeze_time(INSTANT)
def test_delete_annule_sans_supprimer(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)

    reponse = api_client.delete(
        reverse("rendez-vous-detail", args=[corps["id"]]), {"motif": "Désistement"}
    )
    assert reponse.status_code == 200
    relu = Appointment.objects.get(pk=corps["id"])
    assert relu.statut == Appointment.Statut.ANNULE
    assert relu.motif_annulation == "Désistement"


@freeze_time(INSTANT)
def test_delete_par_un_autre_patient_refuse(
    api_client: APIClient, plateau: tuple
) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)

    api_client.force_login(PatientFactory())
    reponse = api_client.delete(reverse("rendez-vous-detail", args=[corps["id"]]))
    assert reponse.status_code == 404


# -------------------------------------------------------------------- notes


@freeze_time(INSTANT)
def test_mise_a_jour_des_notes(api_client: APIClient, plateau: tuple) -> None:
    profil, soin = plateau
    api_client.force_login(PatientFactory())
    corps = _reserver(api_client, profil, soin)

    reponse = api_client.patch(
        reverse("rendez-vous-detail", args=[corps["id"]]), {"notes": "Douleur aiguë"}
    )
    assert reponse.status_code == 200
    assert reponse.json()["notes"] == "Douleur aiguë"


@freeze_time(INSTANT)
def test_le_statut_n_est_pas_modifiable_en_patch(
    api_client: APIClient, plateau: tuple
) -> None:
    """L'état ne se change que via les actions dédiées (machine à états)."""
    profil, soin = plateau
    api_client.force_login(AdminFactory())
    rdv = AppointmentFactory(
        debut=combine_local(LUNDI, time(9, 0)), fin=combine_local(LUNDI, time(9, 30))
    )
    reponse = api_client.patch(
        reverse("rendez-vous-detail", args=[rdv.id]), {"statut": "completed"}
    )
    assert reponse.status_code == 200
    assert reponse.json()["statut"] == "pending"


@freeze_time(INSTANT)
def test_patch_notes_par_un_admin_sur_rdv_inconnu(api_client: APIClient) -> None:
    api_client.force_login(AdminFactory())
    reponse = api_client.patch(
        reverse("rendez-vous-detail", args=["00000000-0000-0000-0000-000000000000"]),
        {"notes": "x"},
    )
    assert reponse.status_code == 404
