from typing import Any

from django.conf import settings
from rest_framework.authentication import SessionAuthentication
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import Token


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request: Request) -> tuple[Any, Token] | None:
        raw_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token.encode("utf-8"))
        user = self.get_user(validated_token)

        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            session_auth = SessionAuthentication()
            session_auth.enforce_csrf(request)

        return user, validated_token
