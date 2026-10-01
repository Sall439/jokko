from django.urls import URLPattern, URLResolver, path

from apps.accounts.views import (
    CsrfTokenView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
    UserDetailView,
    UserListView,
)

urlpatterns: list[URLPattern | URLResolver] = [
    path("auth/csrf", CsrfTokenView.as_view(), name="auth-csrf"),
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/me", MeView.as_view(), name="auth-me"),
    path("utilisateurs", UserListView.as_view(), name="user-list"),
    path("utilisateurs/<uuid:pk>", UserDetailView.as_view(), name="user-detail"),
]
