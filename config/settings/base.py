from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, "insecure-secret-key"),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    DATABASE_URL=(str, "postgres://postgres:postgres@localhost:5432/jokkodentiste"),
    ADMIN_URL=(str, "admin/"),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
    JWT_AUTH_SECURE=(bool, False),
    BUSINESS_TIME_ZONE=(str, "Africa/Dakar"),
    APPOINTMENT_CANCELLATION_WINDOW_HOURS=(int, 24),
    APPOINTMENT_SLOT_GRANULARITY_MINUTES=(int, 30),
    APPOINTMENT_BOOKING_HORIZON_DAYS=(int, 90),
    APPOINTMENT_MIN_LEAD_MINUTES=(int, 60),
    NOTIFICATIONS_ENABLED=(bool, True),
    NOTIFICATIONS_SMS_ENABLED=(bool, False),
    NOTIFICATIONS_ASYNC=(bool, False),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

INSTALLED_APPS = [
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    "apps.catalog",
    "apps.practitioners",
    "apps.availability",
    "apps.appointments",
    "apps.notifications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL"),
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.Argon2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Dakar"
USE_TZ = True
USE_I18N = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"

ADMIN_URL = env("ADMIN_URL")

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

JWT_AUTH_COOKIE = "access"
JWT_AUTH_REFRESH_COOKIE = "refresh"
JWT_AUTH_SECURE = env("JWT_AUTH_SECURE")
JWT_AUTH_SAMESITE = "Lax"

# --- Réglages métier (cabinet dentaire, Dakar) -------------------------------
BUSINESS_TIME_ZONE = env("BUSINESS_TIME_ZONE")
# Délai minimal avant le rendez-vous pour qu'un patient puisse encore annuler.
APPOINTMENT_CANCELLATION_WINDOW_HOURS = env("APPOINTMENT_CANCELLATION_WINDOW_HOURS")
# Granularité du calcul des créneaux libres (minutes).
APPOINTMENT_SLOT_GRANULARITY_MINUTES = env("APPOINTMENT_SLOT_GRANULARITY_MINUTES")
# Horizon de réservation : au-delà, aucun créneau n'est proposé.
APPOINTMENT_BOOKING_HORIZON_DAYS = env("APPOINTMENT_BOOKING_HORIZON_DAYS")
# Délai minimum (lead time) entre maintenant et le début du rendez-vous.
APPOINTMENT_MIN_LEAD_MINUTES = env("APPOINTMENT_MIN_LEAD_MINUTES")

NOTIFICATIONS_ENABLED = env("NOTIFICATIONS_ENABLED")
NOTIFICATIONS_SMS_ENABLED = env("NOTIFICATIONS_SMS_ENABLED")
# Réservé à la production : dispatch via Celery si disponible.
NOTIFICATIONS_ASYNC = env("NOTIFICATIONS_ASYNC")

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "JokkoDentiste <no-reply@jokkodentiste.sn>"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.accounts.authentication.CookieJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth": "5/min",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "JokkoDentiste API",
    "DESCRIPTION": "API de prise de rendez-vous pour cabinet dentaire",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    # L'app `accounts` n'est pas annotable (APIViews historiques) : un hook
    # de post-traitement complète ses charges utiles dans le schéma.
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
        "config.schema.documenter_endpoints_auth",
    ],
    # Les enums de statuts portent tous le même nom de champ (`statut`) : sans
    # ces noms forcés, drf-spectacular renomme le statut d'un rendez-vous en
    # « Statut237Enum ». Les valeurs sont résolues par chemin pointé : le
    # hachage doit porter sur les couples (valeur, libellé) réels.
    "ENUM_NAME_OVERRIDES": {
        "AppointmentStatutEnum": "apps.appointments.models.Appointment.Statut",
        "NotificationStatutEnum": "apps.notifications.models.Notification.Statut",
        "NotificationTypeEnum": "apps.notifications.models.Notification.Type",
    },
}

UNFOLD = {
    "SITE_TITLE": "JokkoDentiste Admin",
    "SITE_HEADER": "JokkoDentiste",
    "SITE_SYMBOL": "local_hospital",
    "COLORS": {
        "primary": {
            "50": "#E1F3F5",
            "100": "#C2E7EB",
            "200": "#85CFD7",
            "300": "#49B7C2",
            "400": "#1B9FAA",
            "500": "#0A7E8A",
            "600": "#086671",
            "700": "#08505B",
            "800": "#053A42",
            "900": "#03242B",
        },
    },
    "SIDEBAR": {
        "navigation": [
            {
                "title": "Cabinet",
                "separator": True,
                "items": [],
            },
            {
                "title": "Comptes",
                "separator": True,
                "items": [
                    {
                        "title": "Utilisateurs",
                        "icon": "person",
                        "link": "/admin/accounts/user/",
                    },
                ],
            },
            {
                "title": "Suivi",
                "separator": True,
                "items": [],
            },
        ],
    },
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
