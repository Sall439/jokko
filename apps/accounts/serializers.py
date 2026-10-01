from typing import Any

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer[User]):
    class Meta:
        model = User
        fields = ("id", "nom", "prenom", "email", "telephone", "role")
        read_only_fields = ("id", "role")


class RegisterSerializer(serializers.Serializer[dict[str, Any]]):
    email = serializers.EmailField()
    nom = serializers.CharField(max_length=150)
    prenom = serializers.CharField(max_length=150)
    telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate_email(self, value: str) -> str:
        email = value.lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "Un utilisateur avec cet email existe déjà.",
                code="email_already_used",
            )
        return email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value


class LoginSerializer(serializers.Serializer[dict[str, Any]]):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
