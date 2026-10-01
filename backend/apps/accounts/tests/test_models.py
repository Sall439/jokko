import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_user() -> None:
    user = User.objects.create_user(
        email="patient@jokkodentiste.sn",
        password="securepassword123",
        nom="Diop",
        prenom="Amadou",
        role="patient",
    )
    assert user.email == "patient@jokkodentiste.sn"
    assert user.nom == "Diop"
    assert user.prenom == "Amadou"
    assert user.role == "patient"
    assert not user.is_staff
    assert not user.is_superuser
    assert user.is_active
    assert user.check_password("securepassword123")


@pytest.mark.django_db
def test_create_superuser() -> None:
    admin_user = User.objects.create_superuser(
        email="admin@jokkodentiste.sn",
        password="adminpassword123",
        nom="Admin",
        prenom="Super",
    )
    assert admin_user.email == "admin@jokkodentiste.sn"
    assert admin_user.role == "admin"
    assert admin_user.is_staff
    assert admin_user.is_superuser
    assert admin_user.check_password("adminpassword123")
