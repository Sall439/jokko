#!/bin/sh
# =============================================================================
# Point d'entrée du conteneur backend JokkoDentiste (Django + gunicorn).
#
# Rôle : préparer la base puis démarrer le serveur. L'ordre compte, car Django
# refuse de démarrer si les migrations n'ont pas été appliquées.
#
# Les variables de contrôle (toutes facultatives) :
#   RUN_MIGRATIONS=1   Applique `manage.py migrate` au démarrage (défaut : 1).
#                      Mettre 0 pour un déploiement où les migrations sont
#                      déclenchées par une étape de CI séparée.
#   RUN_COLLECTSTATIC=1 Exécute `manage.py collectstatic` au démarrage (défaut : 1).
#                      WhiteNoise sert ces fichiers ; 0 pour démarrer plus vite.
#   DB_WAIT_TIMEOUT=60  Secondes d'attente max de la base (défaut : 60).
#   GUNICORN_*         Voir docker-compose.yml (workers, timeout…).
#
# IMPORTANT : ce fichier doit être en fins de ligne LF (voir .gitattributes),
# sinon /bin/sh le refuse avec « \r: command not found ».
# =============================================================================
set -eu

echo "[entrypoint] Attente de la base de donnees…"

# On tente une VRAIE connexion PostgreSQL (et pas un simple test TCP) : c'est la
# seule façon de savoir que le serveur est démarré ET qu'il accepte nos
# identifiants. La configuration est lue depuis Django (source de vérité),
# jamais redéclarée ici.
python - <<'PYTHON_EOF'
import os
import sys
import time

import django
from django.conf import settings

try:
    django.setup()
except Exception as exc:  # noqa: BLE001
    print(f"[entrypoint] Regles Django illisibles : {exc}", file=sys.stderr)
    sys.exit(1)

database = settings.DATABASES["default"]
timeout = int(os.environ.get("DB_WAIT_TIMEOUT", "60"))
delay = 2
deadline = time.monotonic() + timeout
attempt = 0

import psycopg

print(
    "[entrypoint] Base : {host}:{port}/{name} (max {timeout}s)".format(
        host=database.get("HOST", "localhost"),
        port=database.get("PORT", "5432"),
        name=database.get("NAME", ""),
        timeout=timeout,
    )
)

while True:
    attempt += 1
    try:
        with psycopg.connect(
            dbname=database.get("NAME") or "",
            user=database.get("USER") or "",
            password=database.get("PASSWORD") or "",
            host=database.get("HOST") or "localhost",
            port=int(database.get("PORT") or 5432),
            connect_timeout=3,
        ) as connection:
            connection.execute("SELECT 1")
        print(f"[entrypoint] Base disponible (essai {attempt}).")
        break
    except Exception as exc:  # noqa: BLE001
        if time.monotonic() >= deadline:
            print(
                f"[entrypoint] Base toujours injoignable apres {timeout}s : {exc}",
                file=sys.stderr,
            )
            sys.exit(1)
        print(f"[entrypoint] Base indisponible (essai {attempt}) : {exc}")
        time.sleep(delay)
PYTHON_EOF

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[entrypoint] Application des migrations…"
  python manage.py migrate --noinput
else
  echo "[entrypoint] RUN_MIGRATIONS=0 : migrations sautees."
fi

if [ "${RUN_COLLECTSTATIC:-1}" = "1" ]; then
  echo "[entrypoint] Collecte des fichiers statiques (WhiteNoise)…"
  python manage.py collectstatic --noinput --clear
fi

echo "[entrypoint] Demarrage de gunicorn sur 0.0.0.0:8000…"
# exec remplace ce shell par gunicorn : le PID 1 du conteneur EST gunicorn,
# ce qui fait que `docker stop` envoie bien SIGTERM au bon processus.
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${BACKEND_PORT:-8000}" \
  --workers "${GUNICORN_WORKERS:-3}" \
  --threads "${GUNICORN_THREADS:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-60}" \
  --graceful-timeout "${GUNICORN_GRACEFUL_TIMEOUT:-30}" \
  --access-logfile - \
  --error-logfile - \
  --forwarded-allow-ips "${GUNICORN_FORWARDED_ALLOW_IPS:-*}"
