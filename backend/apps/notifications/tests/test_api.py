"""Tests des endpoints de l'app `notifications`."""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import AdminFactory, DentistFactory, PatientFactory
from apps.appointments.tests.factories import AppointmentFactory
from apps.notifications.models import Notification
from apps.notifications.tests.factories import NotificationFactory
from apps.practitioners.tests.factories import PractitionerFactory

pytestmark = pytest.mark.django_db

LISTE = "notification-list"


def _notif_sans_rdv(**kwargs: object) -> Notification:
    return NotificationFactory(rendez_vous=None, **kwargs)


def test_liste_exige_authentification(api_client: APIClient) -> None:
    assert api_client.get(reverse(LISTE)).status_code == 401


def test_patient_ne_voit_que_ses_notifications(
    api_client: APIClient, patient_user: User
) -> None:
    mienne = _notif_sans_rdv(destinataire=patient_user)
    _notif_sans_rdv(destinataire=PatientFactory())

    api_client.force_login(patient_user)
    reponse = api_client.get(reverse(LISTE))
    assert reponse.status_code == 200
    assert [item["id"] for item in reponse.json()["data"]] == [str(mienne.id)]


def test_admin_voit_toutes_les_notifications(api_client: APIClient) -> None:
    _notif_sans_rdv()
    _notif_sans_rdv()
    api_client.force_login(AdminFactory())
    assert len(api_client.get(reverse(LISTE)).json()["data"]) == 2


def test_praticien_voit_les_notifications_de_ses_rdv(
    api_client: APIClient, dentist_user: User
) -> None:
    mon_profil = PractitionerFactory(user=dentist_user)
    rdv = AppointmentFactory(praticien=mon_profil)
    NotificationFactory(
        rendez_vous=rdv,
        destinataire=rdv.patient,
        type=Notification.Type.RDV_CONFIRME,
    )
    NotificationFactory(
        rendez_vous=AppointmentFactory(praticien=PractitionerFactory()),
        destinataire=PatientFactory(),
        type=Notification.Type.RDV_CONFIRME,
    )

    api_client.force_login(dentist_user)
    donnees = api_client.get(reverse(LISTE)).json()["data"]
    # RDV_CREE (signal) + RDV_CONFIRME : les deux concernent le praticien.
    ids_visibles = {item["rendez_vous"] for item in donnees}
    assert ids_visibles == {str(rdv.id)}


def test_detail_d_une_notification_qui_ne_concerne_pas(api_client: APIClient) -> None:
    notification = _notif_sans_rdv()
    api_client.force_login(PatientFactory())
    assert (
        api_client.get(
            reverse("notification-detail", args=[notification.id])
        ).status_code
        == 404
    )


def test_praticien_lit_la_notification_d_un_rdv_de_son_agenda(
    api_client: APIClient,
) -> None:
    """La notification d'un rendez-vous de son agenda lui reste accessible."""
    mon_profil = PractitionerFactory()
    rdv = AppointmentFactory(praticien=mon_profil)
    notification = NotificationFactory(
        rendez_vous=rdv,
        destinataire=rdv.patient,
        type=Notification.Type.RDV_CONFIRME,
    )
    api_client.force_login(mon_profil.user)
    assert (
        api_client.get(
            reverse("notification-detail", args=[notification.id])
        ).status_code
        == 200
    )


def test_permission_objet_refuse_un_practicien_etranger(
    api_client: APIClient,
) -> None:
    """Un praticien ne lit pas les notifications d'un autre agenda."""
    autre = PractitionerFactory()
    rdv = AppointmentFactory(praticien=autre)
    notification = NotificationFactory(
        rendez_vous=rdv,
        destinataire=rdv.patient,
        type=Notification.Type.RDV_CONFIRME,
    )
    api_client.force_login(PractitionerFactory().user)
    assert (
        api_client.get(
            reverse("notification-detail", args=[notification.id])
        ).status_code
        == 404
    )


def test_detail_inconnu(api_client: APIClient) -> None:
    api_client.force_login(AdminFactory())
    assert (
        api_client.get(
            reverse(
                "notification-detail",
                args=["00000000-0000-0000-0000-000000000000"],
            )
        ).status_code
        == 404
    )


def test_filtres_type_statut_lue(api_client: APIClient) -> None:
    patient = PatientFactory()
    _notif_sans_rdv(
        destinataire=patient, type=Notification.Type.RDV_CREE, lue=False
    )
    _notif_sans_rdv(
        destinataire=patient,
        type=Notification.Type.RDV_CONFIRME,
        lue=True,
    )
    api_client.force_login(patient)

    url = reverse(LISTE)
    assert (
        len(api_client.get(f"{url}?type=appointment_confirmed").json()["data"]) == 1
    )
    assert len(api_client.get(f"{url}?lue=true").json()["data"]) == 1
    assert len(api_client.get(f"{url}?lue=false").json()["data"]) == 1
    assert len(api_client.get(f"{url}?statut=failed").json()["data"]) == 0


def test_contenu_de_la_notification(api_client: APIClient) -> None:
    rdv = AppointmentFactory()
    notification = NotificationFactory(
        rendez_vous=rdv,
        destinataire=rdv.patient,
        type=Notification.Type.RDV_CONFIRME,
    )
    api_client.force_login(rdv.patient)
    donnees = api_client.get(
        reverse("notification-detail", args=[notification.id])
    ).json()
    assert donnees["type_libelle"] == "Rendez-vous confirmé"
    assert donnees["destinataire_nom"] == notification.destinataire_nom
    assert donnees["soin_nom"] == rdv.soin.nom
    assert donnees["lue"] is False
    assert set(donnees) >= {
        "id",
        "sujet",
        "message",
        "statut",
        "statut_libelle",
        "canal",
        "envoi_le",
    }


def test_marquer_lue_par_le_proprietaire(api_client: APIClient) -> None:
    patient = PatientFactory()
    notification = _notif_sans_rdv(destinataire=patient, lue=False)
    api_client.force_login(patient)

    reponse = api_client.post(
        reverse("notification-marquer-lue", args=[notification.id])
    )
    assert reponse.status_code == 200
    assert reponse.json()["lue"] is True


def test_marquer_lue_par_un_autre_patient_refuse(api_client: APIClient) -> None:
    notification = _notif_sans_rdv()
    api_client.force_login(PatientFactory())
    reponse = api_client.post(
        reverse("notification-marquer-lue", args=[notification.id])
    )
    # Le queryset est déjà filtré par destinataire : DRF répond 404.
    assert reponse.status_code == 404


def test_marquer_toutes_lues(api_client: APIClient) -> None:
    patient = PatientFactory()
    _notif_sans_rdv(destinataire=patient, lue=False)
    _notif_sans_rdv(destinataire=patient, lue=True)
    api_client.force_login(patient)

    reponse = api_client.post(reverse("notification-marquer-toutes-lues"))
    assert reponse.status_code == 204
    assert (
        Notification.objects.filter(destinataire=patient, lue=False).count() == 0
    )


def test_admin_marque_lue_une_notification(api_client: APIClient) -> None:
    notification = _notif_sans_rdv(destinataire=PatientFactory(), lue=False)
    api_client.force_login(AdminFactory())
    reponse = api_client.post(
        reverse("notification-marquer-lue", args=[notification.id])
    )
    assert reponse.status_code == 200
    assert reponse.json()["lue"] is True


def test_pagination_et_meta(api_client: APIClient) -> None:
    from apps.core.pagination import StandardPagination

    patient = PatientFactory()
    for _ in range(3):
        _notif_sans_rdv(destinataire=patient)
    api_client.force_login(patient)
    corps = api_client.get(reverse(LISTE)).json()
    assert set(corps) == {"data", "meta"}
    assert corps["meta"]["total"] == 3
    assert corps["meta"]["pageSize"] == StandardPagination.page_size
    assert len(corps["data"]) == 3


def test_dentiste_sans_profil_ne_voit_rien(api_client: APIClient) -> None:
    _notif_sans_rdv()
    api_client.force_login(DentistFactory())
    # Le dentiste sans rendez-vous n'a aucune notification destinatrice.
    assert api_client.get(reverse(LISTE)).json()["data"] == []
