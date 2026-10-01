import uuid
from typing import Any

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager["User"]):
    def create_user(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> "User":
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)

        role = extra_fields.get("role", "patient")
        if role == "admin":
            extra_fields.setdefault("is_staff", True)
        else:
            extra_fields.setdefault("is_staff", False)

        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superuser doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superuser doit avoir is_superuser=True.")
        if extra_fields.get("role") != "admin":
            raise ValueError("Le superuser doit avoir role='admin'.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("patient", "Patient"),
        ("dentiste", "Dentiste"),
        ("admin", "Admin"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True, verbose_name="Email")
    nom = models.CharField(max_length=150, verbose_name="Nom")
    prenom = models.CharField(max_length=150, verbose_name="Prénom")
    telephone = models.CharField(
        max_length=20, blank=True, default="", verbose_name="Téléphone"
    )
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default="patient", verbose_name="Rôle"
    )

    is_active = models.BooleanField(default=True, verbose_name="Actif")
    is_staff = models.BooleanField(default=False, verbose_name="Staff")
    date_joined = models.DateTimeField(
        default=timezone.now, verbose_name="Date d'inscription"
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nom", "prenom"]

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self) -> str:
        return f"{self.email} ({self.get_role_display()})"
