import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()


@pytest.mark.django_db
def test_register_api(client) -> None:
    url = reverse("auth-register")
    response = client.post(
        url,
        {
            "email": "patient.test@jokkodentiste.sn",
            "password": "strongpassword123",
            "nom": "Diallo",
            "prenom": "Mamadou",
            "role": "admin",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "patient.test@jokkodentiste.sn"
    assert data["role"] == "patient"
    assert "password" not in data
    assert (
        User.objects.get(email="patient.test@jokkodentiste.sn").role
        == "patient"
    )


@pytest.mark.django_db
def test_register_duplicate_email(client) -> None:
    User.objects.create_user(
        email="existing@jokkodentiste.sn",
        password="strongpassword123",
        nom="Test",
        prenom="User",
    )
    url = reverse("auth-register")
    response = client.post(
        url,
        {
            "email": "EXISTING@jokkodentiste.sn",
            "password": "strongpassword123",
            "nom": "Test2",
            "prenom": "User2",
        },
    )
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == "validation_error"
    assert "email" in data["fields"]


@pytest.mark.django_db
def test_login_and_me_api(client) -> None:
    User.objects.create_user(
        email="login@jokkodentiste.sn",
        password="strongpassword123",
        nom="Login",
        prenom="User",
    )
    client.get(reverse("auth-csrf"))

    login_url = reverse("auth-login")
    response = client.post(
        login_url,
        {"email": "login@jokkodentiste.sn", "password": "strongpassword123"},
    )
    assert response.status_code == 200
    assert "access" in response.cookies
    assert "refresh" in response.cookies

    me_url = reverse("auth-me")
    response_me = client.get(me_url)
    assert response_me.status_code == 200
    assert response_me.json()["email"] == "login@jokkodentiste.sn"


@pytest.mark.django_db
def test_admin_user_list_api(client) -> None:
    admin = User.objects.create_superuser(
        email="admin@jokkodentiste.sn",
        password="strongpassword123",
        nom="Admin",
        prenom="Boss",
    )
    User.objects.create_user(
        email="pat@jokkodentiste.sn",
        password="strongpassword123",
        nom="Patient",
        prenom="One",
        role="patient",
    )
    client.force_login(admin)
    url = reverse("user-list")
    response = client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "meta" in data
    assert data["meta"]["total"] >= 2
