# JokkoDentiste — Backend

API Django / Django REST Framework de gestion d'un cabinet dentaire à Dakar :
catalogue des soins, praticiens, disponibilités, prise de rendez-vous et
notifications (email / SMS / WhatsApp).

---

## Sommaire

- [Stack technique](#stack-technique)
- [Installation](#installation)
- [Configuration (.env)](#configuration-env)
- [Lancer le projet](#lancer-le-projet)
- [Données de démonstration](#données-de-démonstration)
- [Tests](#tests)
- [Qualité de code](#qualité-de-code)
- [Règles métier](#règles-métier)
- [API](#api)
- [Architecture](#architecture)
- [Notes d'implémentation](#notes-dimplémentation)

---

## Stack technique

| Sujet | Choix |
| --- | --- |
| Langage | Python 3.12+ |
| Framework | Django 5.2 LTS |
| API | Django REST Framework 3.14 |
| Base de données | PostgreSQL 16 (extension `btree_gist`) |
| Authentification | JWT en cookies `httpOnly` (SimpleJWT) + session Django (CSRF) |
| Filtres / recherche | django-filter |
| Documentation | drf-spectacular (`/api/schema/`, `/api/docs/`) |
| Administration | django-unfold |
| Tests | pytest, pytest-django, factory_boy, freezegun, pytest-cov |
| Qualité | ruff (format + lint), mypy `strict`, pre-commit |

---

## Installation

Pré-requis : **Python 3.12+** et **PostgreSQL 16+** (l'extension `btree_gist`
est créée par la migration initiale de `apps.core`).

```powershell
# 1. Environnement virtuel
python -m venv env
.\env\Scripts\Activate.ps1

# 2. Dépendances (prod + dev)
pip install -r requirements\dev.txt

# 3. Configuration
copy .env.example .env        # puis renseigner DATABASE_URL, SECRET_KEY…
```

Base de données :

```sql
CREATE DATABASE jokkodentiste;
```

Migrations et jeu de démonstration :

```powershell
python manage.py migrate
python manage.py seed_demo
```

> **Note PostgreSQL** — `apps/appointments/migrations` crée une contrainte
> d'exclusion `EXCLUDE USING gist` (anti-double-réservation). Elle exige
> l'extension `btree_gist`, activée automatiquement par la migration
> `apps.core.0001_initial` (droits superutilisateur requis la première fois).

---

## Configuration (.env)

Toutes les variables lues par `config/settings/base.py` (valeurs par défaut
entre parenthèses) :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `DEBUG` | `False` | Mode debug |
| `SECRET_KEY` | — | **À changer en production** |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hôtes autorisés |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/jokkodentiste` | Connexion PostgreSQL |
| `ADMIN_URL` | `admin/` | Préfixe de l'administration |
| `CORS_ALLOWED_ORIGINS` | *(vide)* | Front-end autorisé (cookies ⇒ origines explicites) |
| `CSRF_TRUSTED_ORIGINS` | *(vide)* | Origines de confiance CSRF |
| `JWT_AUTH_SECURE` | `False` | `True` en production (cookies en HTTPS uniquement) |
| `BUSINESS_TIME_ZONE` | `Africa/Dakar` | Fuseau d'affichage des créneaux (stockage en UTC) |
| `APPOINTMENT_CANCELLATION_WINDOW_HOURS` | `24` | Délai minimal avant annulation par un patient |
| `APPOINTMENT_SLOT_GRANULARITY_MINUTES` | `30` | Granularité du calcul des créneaux |
| `APPOINTMENT_BOOKING_HORIZON_DAYS` | `90` | Horizon de réservation |
| `APPOINTMENT_MIN_LEAD_MINUTES` | `60` | Délai minimum avant le début du rendez-vous |
| `NOTIFICATIONS_ENABLED` | `True` | Émission des notifications (déclenchées par signaux) |
| `NOTIFICATIONS_SMS_ENABLED` | `False` | `False` ⇒ le canal SMS bascule sur l'email |
| `NOTIFICATIONS_ASYNC` | `False` | `True` ⇒ notifications laissées en `pending` (dispatch Celery à venir) |

En développement, l'email part sur le backend **console** de Django
(`EMAIL_BACKEND`) : les messages s'affichent dans le terminal, aucun service
externe n'est requis. Les canaux SMS et WhatsApp sont journalisés
(`jokko.notifications`).

---

## Lancer le projet

```powershell
python manage.py runserver
```

| URL | Contenu |
| --- | --- |
| <http://localhost:8000/api/docs/> | Documentation interactive (Swagger UI) |
| <http://localhost:8000/api/schema/> | Schéma OpenAPI (YAML ; `?format=json` pour du JSON) |
| <http://localhost:8000/admin/> | Administration (django-unfold) |
| <http://localhost:8000/health> | Sonde de santé (publique) |

Rappels utiles :

```powershell
python manage.py spectacular --file schema.yaml   # figer le schéma (CI)
python manage.py spectacular --validate           # vérifier sans fichier
python manage.py makemigrations --check          # migrations à jour ?
```

---

## Données de démonstration

```powershell
python manage.py seed_demo              # idempotent : rien n'est recréé
python manage.py seed_demo --force      # purge les données de démo et recrée
```

La commande crée : 1 administrateur, 1 cabinet, 2 spécialités, 4 catégories,
7 soins, 2 praticiens (avec soins proposés et horaires hebdomadaires),
3 patients, 1 congé et quelques rendez-vous (dont un terminé) — les
réservations passent par `reserver()` / `confirmer()`, donc **les règles
métier sont réellement exercées**. Les notifications correspondantes sont
générées par les signaux.

| Compte | Email | Rôle |
| --- | --- | --- |
| Administrateur | `admin@jokkodentiste.sn` | `admin` |
| Praticienne | `awa.ndiaye@jokkodentiste.sn` | `dentiste` |
| Praticien | `moussa.fall@jokkodentiste.sn` | `dentiste` |
| Patients | `patient1@`, `patient2@`, `patient3@jokkodentiste.sn` | `patient` |

Mot de passe commun : `JokkoDemo2026!`

Rappels de notification (à lancer périodiquement, ex. via cron) :

```powershell
python manage.py send_reminders --horizon 24
```

---

## Tests

Une seule commande, base de données de test comprise :

```powershell
.\env\Scripts\python.exe -m pytest
```

| Option | Effet |
| --- | --- |
| `--create-db` | Recrée la base de test |
| `--reuse-db` | Réutilise la base de test (défaut, `addopts`) |
| `--lf` | Rejoue uniquement les tests en échec |
| `-k creneaux` | Filtre par nom |
| `--no-cov` | Sans la couverture |

La couverture est activée par défaut (`--cov=apps`) et **doit atteindre 85 %**
(`fail_under = 85`, `pyproject.toml`). Sont exclus : migrations, `admin.py`,
tests et commandes de gestion.

Organisation : `apps/<app>/tests/` avec un `factories.py` par app
(factory_boy), des tests par couche (`test_models`, `test_services`,
`test_api`), un module de concurrence (`appointments/tests/test_concurrency.py`),
un parcours de bout en bout (`core/tests/test_integration.py`) et des tests de
conformité de la documentation (`core/tests/test_schema.py`,
`core/tests/test_docs_http.py`).

---

## Qualité de code

```powershell
.\env\Scripts\python.exe -m ruff format apps config conftest.py   # formatage
.\env\Scripts\python.exe -m ruff check apps config conftest.py    # lint (E,F,I,N,W,UP)
.\env\Scripts\python.exe -m mypy apps config conftest.py          # typage strict
pre-commit install                                             # crochet de commit
```

---

## Règles métier

**Fuseau horaire** — tout est stocké en UTC (base `USE_TZ = True`) et
converti en `BUSINESS_TIME_ZONE` (Africa/Dakar) pour l'affichage et le calcul
des créneaux. Aucune date naïve ne circule : `apps/core/utils.py` expose
`ensure_aware`, `combine_local`, `local_now`, `start_of_local_day`… (voir
`apps/core/tests/test_utils.py`).

**Réservation d'un créneau** (`apps/appointments/services.py::reserver`) :

- refusée dans le passé, sous le délai minimum (`APPOINTMENT_MIN_LEAD_MINUTES`)
  ou au-delà de l'horizon (`APPOINTMENT_BOOKING_HORIZON_DAYS`) ;
- refusée hors des horaires hebdomadaires du praticien ;
- refusée si le créneau chevauche une exception (congé, fermeture) ;
- refusée si le praticien ne propose pas le soin demandé ;
- refusée si un rendez-vous actif existe sur le même créneau ;
- durée et prix repris du catalogue (`Soin.duree_minutes`, `Soin.prix_xof`).

**Pas de double réservation** — deux barrières indépendantes :

1. `select_for_update` sur l'agenda du praticien dans une transaction
   (`tests/test_concurrency.py` vérifie le verrou réellement émis) ;
2. une contrainte PostgreSQL `EXCLUDE USING gist` sur le chevauchement
   `[debut, fin[`, plus une `UniqueConstraint(praticien, debut)` pour les
   rendez-vous non annulés.

**Cycle de vie** — machine à états `Appointment.TRANSITIONS` :

```
pending  → confirmed | cancelled | no_show
confirmed→ completed | cancelled | no_show
no_show  → cancelled
completed→ cancelled
cancelled→ (terminal)
```

Les transitions passent par `services.changer_statut()` (jamais depuis une
vue). L'annulation **conserve le motif** et respecte la fenêtre de 24 h pour
un patient (l'administration passe outre) ; `Appointment.delete()` et
`AppointmentQuerySet.delete()` **annulent** au lieu de supprimer
(`hard_delete()` est réservé à la maintenance et au seed). Les soins référencés
sont désactivés, pas supprimés.

**Montants** — entiers XOF (`prix_xof`), jamais de flottant ; formatage via
`core.utils.format_xof`.

**Notifications** — déclenchées par `apps/notifications/signals.py` (jamais
dans les vues) via un `post_save` sur `Appointment` : création
(`appointment_created`) et changements de statut réels
(`confirmed` / `cancelled` / `no_show`). L'envoi passe par
`channels.expedier()`, qui route selon le canal (`email`, `sms`, `whatsapp`).
Une contrainte d'unicité `(rendez_vous, type, canal)` rend les rappels
idempotents (`manage.py send_reminders`). `NOTIFICATIONS_ASYNC = True` laisse
les notifications en `pending`, en attente d'un worker Celery (non installé :
la proposition est documentée, pas implémentée).

**Rôles** — `patient`, `dentiste`, `admin` (le rôle `admin` couvre le secrétariat).
Un patient ne réserve que pour lui-même, ne voit et ne modifie que ses données ;
un praticien ne voit que son agenda et gère ses soins proposés ; l'administration
a tous les droits sur le catalogue, les horaires et les statuts.

---

## API

Base : `/api/v1/`. Authentification par cookie JWT `access` (renvoyé par
`POST /api/auth/login`) ; les écritures exigent l'en-tête `X-CSRFToken`.
Toutes les listes acceptent `?page=&page_size=&search=&ordering=`, ainsi que
les filtres propres à chaque ressource. Format d'erreur unifié :

```json
{ "code": "validation_error", "message": "…", "fields": { "champ": ["…"] } }
```

### Authentification et utilisateurs (`/api/`, app `accounts`)

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/auth/csrf` | Cookie CSRF (public) |
| `POST` | `/api/auth/register` | Créer un compte (patient) |
| `POST` | `/api/auth/login` | Se connecter (cookies `access` / `refresh`) |
| `POST` | `/api/auth/refresh` | Rafraîchir le jeton d'accès |
| `POST` | `/api/auth/logout` | Se déconnecter |
| `GET` | `/api/auth/me` | Profil courant |
| `GET` | `/api/utilisateurs` | Lister (admin) — filtres `role`, `email`, recherche |
| `GET` `PATCH` `DELETE` | `/api/utilisateurs/{id}` | Consulter / modifier / supprimer (admin) |

### Catalogue (`/api/v1/catalog/`)

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/v1/catalog/soins/` | Soins actifs — filtres `categorie`, `actif`, recherche |
| `POST` | `/api/v1/catalog/soins/` | Créer (admin) |
| `GET` `PUT` `PATCH` `DELETE` | `/api/v1/catalog/soins/{id}/` | Consulter / modifier / **désactiver** |
| `POST` | `/api/v1/catalog/soins/{id}/activer/` | Réactiver (admin) |
| `POST` | `/api/v1/catalog/soins/{id}/desactiver/` | Désactiver (admin) |
| `GET` | `/api/v1/catalog/categories/` | Catégories |
| `POST` | `/api/v1/catalog/categories/` | Créer (admin) |
| `GET` `PUT` `PATCH` `DELETE` | `/api/v1/catalog/categories/{id}/` | CRUD (admin) |

### Praticiens (`/api/v1/practitioners/`)

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/v1/practitioners/` | Annuaire — filtres `cabinet`, `specialite`, `actif`, recherche |
| `POST` | `/api/v1/practitioners/` | Créer (admin, à partir d'un utilisateur `dentiste`) |
| `GET` `PUT` `PATCH` | `/api/v1/practitioners/{id}/` | Consulter / modifier (admin ou le praticien) |
| `DELETE` | `/api/v1/practitioners/{id}/` | Supprimer (admin) — refusé s'il a des rendez-vous |
| `GET` | `/api/v1/practitioners/moi/` | Profil du praticien connecté |
| `GET` | `/api/v1/practitioners/{id}/soins/` | Soins proposés |
| `GET` `POST` `DELETE` | `/api/v1/practitioners/{id}/soins-proposes/` | Proposer / retirer un soin |
| `GET` `POST` | `/api/v1/practitioners/cabinets/` | Cabinets (création admin) |
| `GET` `PUT` `PATCH` `DELETE` | `/api/v1/practitioners/cabinets/{id}/` | CRUD cabinet (admin) |
| `GET` `POST` | `/api/v1/practitioners/specialites/` | Spécialités (création admin) |
| `GET` `PUT` `PATCH` `DELETE` | `/api/v1/practitioners/specialites/{id}/` | CRUD spécialité (admin) |

### Disponibilités (`/api/v1/availability/`)

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` `POST` | `/api/v1/availability/horaires/` | Horaires hebdomadaires — filtres `praticien`, `jour`, `actif` |
| `GET` `PUT` `PATCH` `DELETE` | `/api/v1/availability/horaires/{id}/` | CRUD horaire |
| `GET` `POST` | `/api/v1/availability/exceptions/` | Congés / fermetures — filtres `praticien`, `type`, `date_min`, `date_max` |
| `GET` `PUT` `PATCH` `DELETE` | `/api/v1/availability/exceptions/{id}/` | CRUD exception |
| `GET` | `/api/v1/availability/creneaux/?praticien=&soin=&date_debut=&date_fin=` | Créneaux réservables (calculés, non stockés) |

### Rendez-vous (`/api/v1/appointments/`)

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/v1/appointments/` | Liste filtrée par rôle — filtres `statut`, `patient`, `praticien`, `soin`, `date_min`, `date_max` |
| `POST` | `/api/v1/appointments/` | Réserver (patient, pour lui-même) |
| `GET` | `/api/v1/appointments/avenir/` | Rendez-vous à venir |
| `GET` | `/api/v1/appointments/{id}/` | Détail |
| `PUT` `PATCH` | `/api/v1/appointments/{id}/` | Notes du patient |
| `POST` | `/api/v1/appointments/{id}/confirmer/` | Confirmer (praticien / admin) |
| `POST` | `/api/v1/appointments/{id}/terminer/` | Terminer (praticien / admin) |
| `POST` | `/api/v1/appointments/{id}/absent/` | Patient absent (praticien / admin) |
| `POST` | `/api/v1/appointments/{id}/annuler/` | Annuler (motif obligatoire, fenêtre de 24 h) |
| `DELETE` | `/api/v1/appointments/{id}/` | Alias d'annulation (jamais de suppression) |

### Notifications (`/api/v1/notifications/`)

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/v1/notifications/` | Mes notifications — filtres `type`, `canal`, `statut`, `lue`, `date_min`, `date_max` |
| `GET` | `/api/v1/notifications/{id}/` | Détail |
| `POST` | `/api/v1/notifications/{id}/marquer-lue/` | Marquer lue |
| `POST` | `/api/v1/notifications/marquer-toutes-lues/` | Tout marquer comme lu |

### Collection prête à l'emploi

`docs/api.http` contient **tous** les endpoints ci-dessus, avec authentification,
en-têtes CSRF et cas d'erreur (401 / 403 / 404 / 400). Ouvrable avec l'extension
*REST Client* (VS Code) ou *HTTP Client* (IntelliJ) :

```
### Le fichier est vérifié par apps/core/tests/test_docs_http.py :
### tout endpoint ajouté ou renommé sans mettre à jour la collection
### fait échouer la suite de tests.
```

---

## Architecture

```
config/            réglages (base / dev / test / prod), URLs, schéma OpenAPI
apps/
  core/            socle : modèle de base (UUID + timestamps), erreurs, pagination,
                   filtres, permissions, utilitaires (temps, XOF), seed_demo, tests e2e
  accounts/        utilisateurs, rôles, JWT en cookies (application existante)
  catalog/         catégories et soins
  practitioners/   praticiens, cabinets, spécialités, soins proposés
  availability/    horaires hebdomadaires, exceptions, calcul des créneaux
  appointments/    rendez-vous : modèle, machine à états, services, vue API
  notifications/   notifications : signaux, canaux, services, rappels
```

Chaque application métier suit la même découpage :

| Fichier | Rôle |
| --- | --- |
| `models.py` | Modèles, contraintes, index, `Meta.ordering`, `__str__` |
| `selectors.py` | Requêtes de lecture (optimisées : `select_related`, `Prefetch`) |
| `services.py` | **Toute** la logique métier (les vues ne décident rien) |
| `serializers.py` | Lecture / écriture séparées, validation métier |
| `filters.py` | django-filter : recherche, filtres, tris |
| `permissions.py` | Règles par rôle et par objet |
| `views.py` | ViewSets + actions (`@action`), annotations OpenAPI |
| `urls.py` | `DefaultRouter` monté sous `/api/v1/<app>/` |
| `admin.py` | Administration django-unfold (filtres, actions, inlines) |
| `tests/factories.py` | Une factory (factory_boy) par modèle |
| `tests/` | Modèles, services, sérialiseurs, endpoints, concurrence, e2e |

Rôles et permissions :

| Ressource | `patient` | `dentiste` | `admin` |
| --- | --- | --- | --- |
| Catalogue | lecture | lecture | lecture + écriture |
| Praticiens / cabinets / spécialités | lecture | lecture (+ son profil, ses soins proposés) | complet |
| Horaires / exceptions | lecture | lecture + écriture (le sien) | complet |
| Créneaux | lecture (créneaux réservables) | idem | idem |
| Rendez-vous | les siens, réservation, notes, annulation | son agenda, confirmation / fin / absence | complet |
| Notifications | les siennes | celles liées à son agenda | toutes |

---

## Notes d'implémentation

- **Deux bugs corrigés dans `config/settings/base.py`** (paramètres sans effet
  auparavant) : la clé DRF `DEFAULT_EXCEPTION_HANDLER` (inexistante) remplacée
  par `EXCEPTION_HANDLER`, et `SessionAuthentication` ajoutée à
  `DEFAULT_AUTHENTICATION_CLASSES` (sans elle, aucune authentification par
  session et donc pas de contrôle CSRF sur les écritures par cookie).
- **L'app `accounts` n'a pas été modifiée** : ses endpoints ne sont pas
  annotables pour OpenAPI (`APIView` historiques). La documentation de leurs
  charges utiles est injectée par un hook de post-traitement
  (`config/schema.py::documenter_endpoints_auth`), et l'extension
  `CookieJWTAuthenticationScheme` déclare le cookie JWT comme schéma de
  sécurité.
- **`btree_gist` / `EXCLUDE USING gist`** — Django 5.2 n'a pas
  `ExclusionConstraint` ; la contrainte d'exclusion est donc créée en SQL via
  `RunSQL`, complétée par une `UniqueConstraint(praticien, debut)` portable.
- **Celery n'est pas installé** : `NOTIFICATIONS_ASYNC` laisse les notifications
  en `pending`, prêtes pour un worker. Le dispatch synchrone est la valeur par
  défaut en développement.
- **Montants** : entiers XOF uniquement ; le formatage est centralisé dans
  `format_xof`.

---

## API Details — Requêtes et réponses types

Chaque endpoint utilise l'enveloppe d'erreur unifiée `core.exceptions` :
```json
{ "code": "validation_error", "message": "Erreur de validation des données.",
  "fields": { "champ": [ "message d'erreur" ] } }
```
Ou en cas d'erreur non associée à un champ :
```json
{ "code": "invalid", "message": "Message d'erreur." }
```
Toutes les réponses réussies (200/201) renvoient un objet `data` ou `detail`
conformément au schema OpenAPI (`/api/schema/`).

### 1. Authentification — `/api/accounts/`

| Méthode | Chemin | Headers | Corps requête | Réponse 200/201 |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | `Content-Type: application/json` | ```json\n{ "email": "patient@exemple.sn", "nom": "Diouf", "prenom": "Moussa", "telephone": "+221771234567", "password": "MotDePasseSolide123" }\n``` | ```json\n{ "id": "00000000-0000-0000-0000-000000000000", "nom": "Diouf", "prenom": "Moussa", "email": "patient@exemple.sn", "telephone": "+221771234567", "role": "patient" }\n``` |
| `POST` | `/api/auth/login` | `Content-Type: application/json` + `X-CSRFToken` (requis pour les écritures) | ```json\n{ "email": "patient1@jokkodentiste.sn", "password": "JokkoDemo2026!" }\n``` | ```json\n{ "detail": "Connecté : cookies `access` et `refresh` posés." }\n``` |
| `GET` | `/api/auth/me` | `Cookie: access=...` (authentification par cookie) | *aucun* | ```json\n{ "id": "00000000-0000-0000-0000-000000000000", "nom": "Awa", "prenom": "Ndiaye", "email": "awa.ndiaye@jokkodentiste.sn", "telephone": "+221338100000", "role": "dentiste" }\n``` |

### 2. Rendez-vous — `/api/v1/appointments/`

| Méthode | Chemin | Headers | Corps requête | Réponse 201 |
|---|---|---|---|---|
| `POST` | `/api/appointments/` | `Cookie: access=...` + `X-CSRFToken` | ```json\n{ "praticien": "00000000-0000-0000-0000-000000000000", "soin": "00000000-0000-0000-0000-000000000000", "debut": "2030-06-03T09:00:00+00:00", "notes": "Première visite" }\n``` | ```json\n{ "id": "00000000-0000-0000-0000-000000000000", "patient": "00000000-0000-0000-0000-000000000000", "praticien": "00000000-0000-0000-0000-000000000000", "soin": "00000000-0000-0000-0000-000000000000", "debut": "2030-06-03T09:00:00+00:00", "statut": "pending", "notes": "Première visite", "prix_xof": 10000, "created_at": "2026-...", "updated_at": "2026-..." }\n``` |

**Erreurs courantes :**
- `400` : rendez-vous dans le passé, hors horizon, dehors des heures du praticien, double réservation
- `403` : patient essayant de réserver pour un autre, dentiste essayant de réserver pour soi
- `400` : motif manquant en annulation hors fenêtre (admin contourné)

| `POST` | `/api/appointments/{id}/annuler/` | `Cookie: access=...` + `X-CSRFToken` | ```json\n{ "motif": "Empêchement du patient" }\n``` | ```json\n{ "id": "...", "statut": "cancelled", "motif": "Empêchement du patient", "updated_at": "2026-..." }\n``` |

### 3. Catalogue — `/api/v1/catalog/`

| Méthode | Chemin | Corps requête | Réponse 201 |
|---|---|---|---|
| `POST` | `/api/v1/catalog/soins/` | ```json\n{ "nom": "Detartrage", "description": "Nettoyage dentaire", "duree_minutes": 30, "prix_xof": 15000, "categorie": "00000000-0000-0000-0000-000000000000", "actif": true }\n``` | ```json\n{ "id": "00000000-0000-0000-0000-000000000000", "nom": "Detartrage", "description": "Nettoyage dentaire", "duree_minutes": 30, "prix_xof": 15000, "categorie": "00000000-0000-0000-0000-000000000000", "actif": true, "created_at": "...", "updated_at": "..." }\n``` |

| `GET` | `/api/v1/catalog/soins/?categorie=...&actif=true` | *aucun* | Tableau d'objets `soin` avec filtres |

### 4. Praticiens — `/api/v1/practitioners/`

| Méthode | Chemin | Corps requête | Réponse 201 |
|---|---|---|---|
| `POST` | `/api/v1/practitioners/` | ```json\n{ "user": "00000000-0000-0000-0000-000000000000", "cabinet": "00000000-0000-0000-0000-000000000000", "specialites": ["00000000-0000-0000-0000-000000000000"], "biographie": "Chirurgie ambulatoire.", "annees_experience": 5, "numero_ordre": "SN-ORD-2021-0001", "actif": true }\n``` | ```json\n{ "id": "00000000-0000-0000-0000-000000000000", "user": "00000000-0000-0000-0000-000000000000", "cabinet": "00000000-0000-0000-0000-000000000000", "specialites": ["00000000-0000-0000-0000-000000000000"], "biographie": "Chirurgie ambulatoire.", "annees_experience": 5, "numero_ordre": "SN-ORD-2021-0001", "actif": true, "created_at": "...", "updated_at": "..." }\n``` |

| `GET` | `/api/v1/practitioners/moi/` | `Cookie: access=...` | *aucun* | ```json\n{ "id": "00000000-0000-0000-0000-000000000000", "nom": "Dr Awa", "prenom": "Ndiaye", "email": "awa.ndiaye@jokkodentiste.sn", "telephone": "+221338100000", "role": "dentiste", "specialites": [...], "soins": [...], "actif": true }\n``` |

### 5. Notifications — `/api/v1/notifications/`

| Méthode | Chemin | Headers | Réponse 200 |
|---|---|---|---|
| `GET` | `/api/v1/notifications/` | `Cookie: access=...` | Tableau d'objets `notification` avec filtres `?type=reminder&statut=sent&lue=false` |
| `POST` | `/api/v1/notifications/{id}/marquer-lue/` | `Cookie: access=...` | ```json\n{ "id": "...", "lue": true, "updated_at": "2026-..." }\n``` |

---

### En-têtes système requis

| En-tête | Quand | Valeur |
|---|---|---|
| `Content-Type: application/json` | Toutes les requêtes POST/PUT/PATCH/DELETE | Corps JSON |
| `X-CSRFToken: <valeur>` | Toutes les écritures (POST/PUT/PATCH/DELETE) | Cookie `csrftoken` récupéré via `GET /api/auth/csrf` |
| `Cookie: access=...` | Toutes les requêtes authentifiées (GET/POST/etc.) | Cookie JWT posé par `POST /api/auth/login` |
| `Referer: http://localhost:8000` | Some endpoints Django CHECK `Referer` | Non stricte mais recommandé |

---

## Collection complète

Le fichier `docs/api.http` contient **l'ensemble** des endpoints ci-dessus (auth, catalogue, praticiens, disponibilités, rendez-vous, notifications) avec :
- Toutes les méthodes (GET/POST/PUT/PATCH/DELETE)
- Headers CSRF et cookies
- Cas d'erreur (400, 401, 403, 404, 409)
- Exemples de corps de requête et de réponse

Utilisable avec l'extension *REST Client* (VS Code) ou *HTTP Client* (IntelliJ). Chaque mise à jour de l'API doit faire passer le test `test_docs_http.py` pour rester en conformité.

- **Montants** : entiers XOF uniquement ; le formatage est centralisé dans
  `format_xof`.
