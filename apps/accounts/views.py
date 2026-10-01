from typing import Any, cast

from django.db.models.deletion import ProtectedError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.filters import UserFilter
from apps.accounts.models import User
from apps.accounts.permissions import IsAdminRole
from apps.accounts.selectors import get_user_list
from apps.accounts.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.accounts.services import (
    authenticate_user,
    clear_jwt_cookies,
    register_user,
    set_jwt_cookies,
    update_user,
)
from apps.core.pagination import StandardPagination


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(summary="Obtenir le cookie CSRF", responses={200: None})
    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return Response({"detail": "CSRF cookie set successfully."})


@extend_schema(tags=["Auth"])
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = register_user(serializer.validated_data)
        out_serializer = UserSerializer(user)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Auth"])
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate_user(
            serializer.validated_data["email"],
            serializer.validated_data["password"],
        )
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        response = Response(UserSerializer(user).data)
        set_jwt_cookies(response, access, str(refresh))
        return response


@extend_schema(tags=["Auth"])
class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        refresh_token = request.COOKIES.get("refresh")
        if not refresh_token:
            return Response(
                {
                    "code": "invalid_token",
                    "message": "Jeton de rafraîchissement manquant.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            # Note : l'annotation de simplejwt (`Optional[Token]`) est erronée,
            # le constructeur accepte bien une chaîne encodée.
            refresh = RefreshToken(refresh_token)  # type: ignore[arg-type]
            # Rotation : l'ancien jeton est révoqué avant d'en créer un nouveau.
            try:
                refresh.blacklist()
            except Exception:
                pass
            refresh.set_jti()
            refresh.set_exp()

            user = User.objects.get(id=refresh["user_id"])
            new_refresh = RefreshToken.for_user(user)
            new_access = str(new_refresh.access_token)

            response = Response({"detail": "Token refreshed successfully."})
            set_jwt_cookies(response, new_access, str(new_refresh))
            return response
        except Exception:
            return Response(
                {
                    "code": "invalid_token",
                    "message": "Jeton de rafraîchissement invalide ou expiré.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )


@extend_schema(tags=["Auth"])
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        refresh_token = request.COOKIES.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)  # type: ignore[arg-type]
                token.blacklist()
            except Exception:
                pass

        response = Response({"detail": "Déconnexion réussie."})
        clear_jwt_cookies(response)
        return response


@extend_schema(tags=["Auth"])
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        user = cast("User", request.user)
        serializer = UserSerializer(user)
        return Response(serializer.data)


@extend_schema(tags=["Utilisateurs"])
class UserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        queryset = get_user_list()
        filtered = UserFilter(request.GET, queryset=queryset)

        paginator = StandardPagination()
        page: list[User] | None = paginator.paginate_queryset(
            filtered.qs, request, view=self
        )
        if page is not None:
            serializer = UserSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = UserSerializer(filtered.qs, many=True)
        return Response({"data": serializer.data})


@extend_schema(tags=["Utilisateurs"])
class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_object(self, pk: Any) -> User:
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise NotFound("Utilisateur non trouvé.")

    def get(
        self, request: Request, pk: Any, *args: Any, **kwargs: Any
    ) -> Response:
        user = self.get_object(pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def patch(
        self, request: Request, pk: Any, *args: Any, **kwargs: Any
    ) -> Response:
        user = self.get_object(pk)
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = update_user(
            user, serializer.validated_data, cast("User", request.user)
        )
        return Response(UserSerializer(updated_user).data)

    def delete(
        self, request: Request, pk: Any, *args: Any, **kwargs: Any
    ) -> Response:
        user = self.get_object(pk)
        if request.user.id == user.id:
            return Response(
                {
                    "code": "cannot_modify_self",
                    "message": (
                        "Un administrateur ne peut pas se supprimer"
                        " lui-même."
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )
        try:
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            return Response(
                {
                    "code": "resource_in_use",
                    "message": (
                        "Ressource en cours d'utilisation, suppression"
                        " impossible."
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )
