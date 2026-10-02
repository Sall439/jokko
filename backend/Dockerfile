# syntax=docker/dockerfile:1.7

# =============================================================================
# Backend JokkoDentiste — Django 5.2 LTS + Django REST Framework.
#
# Deux étapes :
#   1. builder — construit un environnement virtuel dans /opt/venv
#   2. runtime — ne contient QUE /opt/venv + le code, utilisateur non-root
#
# Choix techniques :
#   - psycopg[binary] (requirements/base.txt) embarque déjà son propre libpq :
#     aucune bibliothèque système PostgreSQL n'est donc nécessaire dans
#     l'image finale (ni libpq5, ni gcc).
#   - Toutes les dépendances déclarées possèdent des wheels manylinux
#     compatibles Python 3.12 : aucun compilateur n'est requis dans le builder.
# =============================================================================

# ---------- Étape 1 : construction de l'environnement virtuel ----------
FROM python:3.12.15-slim-bookworm AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# /opt/venv est hors de /app : il pourra être copié tel quel dans l'image
# finale, dont le /app ne contient que le code applicatif.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# On copie d'abord les seuls fichiers de dépendances : tant qu'ils ne changent
# pas, la couche d'installation est réutilisée par Docker.
COPY requirements/ ./requirements/
RUN pip install -r requirements/prod.txt

# ---------- Étape 2 : image d'exécution ----------
FROM python:3.12.15-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings.prod \
    BACKEND_PORT=8000

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv

# Utilisateur non-root dédié (uid/gid 1001). Le port 8000 n'étant pas
# privilégié, aucun privilège n'est nécessaire.
RUN groupadd --system --gid 1001 jokko \
 && useradd --system --uid 1001 --gid 1001 --no-create-home \
            --shell /usr/sbin/nologin jokko

# Le code est copié APRÈS la création de l'utilisateur pour que les fichiers
# lui appartiennent : c'est ce qui permet à collectstatic d'écrire dans
# /app/staticfiles au démarrage.
COPY --chown=jokko:jokko . /app

# staticfiles/ est le STATIC_ROOT : collectstatic y écrit à chaque démarrage.
RUN mkdir -p /app/staticfiles \
 && chown -R jokko:jokko /app/staticfiles

# Entrée en LF obligatoire pour que /bin/sh interprète le script.
RUN sed -i 's/\r$//' /app/entrypoint.sh \
 && chmod +x /app/entrypoint.sh

USER jokko:jokko

EXPOSE 8000

# Sonde de santé : l'endpoint /health existe déjà dans le projet
# (config/urls.py -> apps.core.views.health_check) et vérifie en plus la
# connectivité à la base. On interroge le port interne, pas le port publié.
# Python suffit : pas besoin d'installer curl (qui alourdirait l'image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)" || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
