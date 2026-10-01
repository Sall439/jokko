from typing import Any, cast

from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.response import Response

from apps.accounts.models import User


def register_user(validated_data: dict[str, Any]) -> User:
    validated_data.pop("role", None)
    return User.objects.create_user(
        email=validated_data["email"],
        password=validated_data["password"],
        nom=validated_data["nom"],
        prenom=validated_data["prenom"],
        telephone=validated_data.get("telephone", ""),
        role="patient",
    )


def authenticate_user(email: str, password: str) -> User:
    user = authenticate(email=email, password=password)
    if user is None or not user.is_active:
        raise AuthenticationFailed(
            detail="Email ou mot de passe incorrect.",
            code="invalid_credentials",
        )
    return user


def set_jwt_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    secure = settings.JWT_AUTH_SECURE
    samesite = cast(Any, settings.JWT_AUTH_SAMESITE)

    response.set_cookie(
        key=settings.JWT_AUTH_COOKIE,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=15 * 60,
    )

    response.set_cookie(
        key=settings.JWT_AUTH_REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/api/auth/",
        max_age=7 * 24 * 60 * 60,
    )


def clear_jwt_cookies(response: Response) -> None:
    response.delete_cookie(settings.JWT_AUTH_COOKIE)
    response.delete_cookie(settings.JWT_AUTH_REFRESH_COOKIE, path="/api/auth/")


def update_user(user: User, validated_data: dict[str, Any], actor: User) -> User:
    if actor.id == user.id and actor.role == "admin":
        if "is_active" in validated_data and not validated_data["is_active"]:
            raise ValidationError(
                {"detail": ("Un administrateur ne peut pas se désactiver lui-même.")},
                code="cannot_modify_self",
            )
        if "role" in validated_data and validated_data["role"] != "admin":
            raise ValidationError(
                {"detail": ("Un administrateur ne peut pas se rétrograder lui-même.")},
                code="cannot_modify_self",
            )

    role = validated_data.get("role", user.role)
    if role == "admin":
        validated_data["is_staff"] = True
    else:
        validated_data["is_staff"] = False

    for attr, value in validated_data.items():
        setattr(user, attr, value)
    user.save()
    return user
