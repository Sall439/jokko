"""Fixtures partagées par toutes les apps."""

from typing import Any

import factory
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    AdminFactory,
    DentistFactory,
    PatientFactory,
    UserFactory,
)

User = get_user_model()  # type: ignore[misc, assignment]


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def user_factory() -> type[factory.django.DjangoModelFactory]:
    return UserFactory


@pytest.fixture
def patient_factory() -> type[factory.django.DjangoModelFactory]:
    return PatientFactory


@pytest.fixture
def dentist_factory() -> type[factory.django.DjangoModelFactory]:
    return DentistFactory


@pytest.fixture
def admin_factory() -> type[factory.django.DjangoModelFactory]:
    return AdminFactory


@pytest.fixture
def admin_user() -> Any:
    return AdminFactory(email="admin@jokkodentiste.sn")


@pytest.fixture
def dentist_user() -> Any:
    return DentistFactory(email="dentiste@jokkodentiste.sn")


@pytest.fixture
def patient_user() -> Any:
    return PatientFactory(email="patient@jokkodentiste.sn")


@pytest.fixture
def other_patient_user() -> Any:
    return PatientFactory(email="autre.patient@jokkodentiste.sn")


@pytest.fixture
def authenticated_client(api_client: APIClient) -> APIClient:
    api_client.force_login(PatientFactory())
    return api_client


def force_login_user(client: APIClient, user: AbstractBaseUser) -> APIClient:
    """Connecte un utilisateur via la session (auth admin Django)."""
    client.force_login(user)
    return client
