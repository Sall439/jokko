"""Factories des utilisateurs (roles : patient, dentiste, admin)."""

from typing import Any

import factory
from django.contrib.auth import get_user_model

User = get_user_model()  # type: ignore[misc, assignment]

DEFAULT_PASSWORD = "TestPassword123!"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    id = factory.Faker("uuid4")
    email = factory.Sequence(lambda n: f"user{n}@jokkodentiste.sn")
    nom = factory.Faker("last_name")
    prenom = factory.Faker("first_name")
    telephone = factory.Sequence(lambda n: f"+2217710000{n:03d}")
    role = "patient"
    is_active = True

    @factory.post_generation
    def password(self: Any, create: bool, extracted: str, **kwargs: Any) -> None:
        raw = extracted or DEFAULT_PASSWORD
        self.set_password(raw)
        # `skip_postgeneration_save = True` evite un save supplementaire :
        # on persiste donc explicitement le mot de passe ici.
        self.save()


class PatientFactory(UserFactory):
    role = "patient"
    is_staff = False
    is_superuser = False


class DentistFactory(UserFactory):
    """Utilisateur ayant le role ``dentiste`` (profil a creer separement)."""

    role = "dentiste"
    is_staff = False
    is_superuser = False


class AdminFactory(UserFactory):
    role = "admin"
    is_staff = True
    is_superuser = True
