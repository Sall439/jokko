import pytest
from rest_framework.exceptions import AuthenticationFailed, ValidationError

from apps.accounts.models import User
from apps.accounts.services import authenticate_user, register_user, update_user


@pytest.mark.django_db
def test_register_user_forces_patient_role() -> None:
    data = {
        "email": "newpatient@jokkodentiste.sn",
        "password": "securepassword123",
        "nom": "Sow",
        "prenom": "Fatou",
        "role": "admin",
    }
    user = register_user(data)
    assert user.role == "patient"
    assert not user.is_staff


@pytest.mark.django_db
def test_authenticate_user_invalid_credentials() -> None:
    User.objects.create_user(
        email="user@jokkodentiste.sn",
        password="correctpassword123",
        nom="Test",
        prenom="User",
    )
    with pytest.raises(AuthenticationFailed) as exc_info:
        authenticate_user("user@jokkodentiste.sn", "wrongpassword")
    assert str(exc_info.value.detail) == "Email ou mot de passe incorrect."

    with pytest.raises(AuthenticationFailed) as exc_info2:
        authenticate_user("unknown@jokkodentiste.sn", "anypassword")
    assert str(exc_info2.value.detail) == "Email ou mot de passe incorrect."


@pytest.mark.django_db
def test_admin_cannot_modify_self() -> None:
    admin = User.objects.create_superuser(
        email="admin@jokkodentiste.sn",
        password="adminpassword123",
        nom="Admin",
        prenom="Super",
    )
    with pytest.raises(ValidationError):
        update_user(admin, {"is_active": False}, admin)

    with pytest.raises(ValidationError):
        update_user(admin, {"role": "patient"}, admin)
