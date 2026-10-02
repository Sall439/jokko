# Contrat d'API — JokkoDentiste

Document de référence pour le backend Node/Express + PostgreSQL + JWT.
Il décrit exactement ce que l'application mobile attend : une route absente ou
dont la forme change se voit ici avant de casser un écran.

- Base URL : `EXPO_PUBLIC_API_URL` (par exemple `https://api.jokkodentiste.sn/api`)
- Encodage : JSON UTF-8, `Content-Type: application/json`
- Authentification : `Authorization: Bearer <access_token>`
- Fuseau : `Africa/Dakar`. Tous les instants sont des ISO 8601 UTC ; les horaires
  de plage sont des minutes depuis minuit.
- Langue des messages d'erreur : français, vouvoiement.

## 1. Enveloppe d'erreur

Toute réponse en échec (4xx, 5xx) renvoie la même enveloppe :

```json
{ "error": { "code": "SLOT_UNAVAILABLE", "message": "Ce créneau n'est plus disponible." } }
```

`code` est le contrat : le client teste le **code**, jamais le `message`.
`message` sert uniquement à l'affichage.

### Codes d'erreur

| Code | Statut(s) HTTP attendu(s) | Signification |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Email ou mot de passe incorrect. |
| `EMAIL_TAKEN` | 409 | Adresse déjà utilisée à l'inscription. |
| `ROLE_NOT_ALLOWED` | 403 | Compte `admin` : pas d'accès à l'application mobile. |
| `SLOT_UNAVAILABLE` | 409 | Le créneau vient d'être pris. |
| `SLOT_IN_PAST` | 422 | Le créneau demandé est déjà passé. |
| `OVERLAP` | 409 | Chevauchement avec un rendez-vous existant. |
| `OUTSIDE_AVAILABILITY` | 422 | Hors des plages déclarées par le praticien. |
| `CANCELLATION_TOO_LATE` | 422 | Annulation à moins de 24 h du rendez-vous. |
| `INVALID_TRANSITION` | 409 | Transition de statut interdite (A8.5). |
| `NOT_FOUND` | 404 | Ressource inexistante. |
| `FORBIDDEN` | 403 | Authenticated, mais pas le droit. |
| `UNAUTHORIZED` | 401 | Jeton absent, expiré ou révoqué. |
| `VALIDATION_ERROR` | 422 | Corps de requête invalide. |
| `INTERNAL_ERROR` | 500 | Erreur serveur. |

Le client dispose d'un message français de repli pour chaque code : un `message`
absent n'affiche donc jamais une chaîne technique.

### Règles que le serveur doit appliquer

Ces règles sont **côté serveur**. Le client les réapplique pour l'affichage
instantanée, mais c'est la réponse du serveur qui fait foi.

1. Deux rendez-vous d'un même dentiste ne se chevauchent pas (comparaison
   semi-ouverte `[début, fin[` : 10:00–11:00 et 11:00–12:00 sont compatibles).
2. Un rendez-vous tombe dans une plage déclarée par le praticien, hors pause, et
   dans le futur.
3. La durée du rendez-vous est celle du soin ; la fin est calculée par le serveur.
4. Un patient annule jusqu'à 24 h avant le début ; un patient ne voit que ses
   rendez-vous, un praticien que les siens.
5. Statuts : `en_attente`, `confirme`, `annule`, `termine`. Transitions autorisées :
   `en_attente → confirme | annule`, `confirme → termine | annule`. `termine` et
   `annule` sont finaux. Toute autre transition renvoie `INVALID_TRANSITION`.
6. Un rendez-vous créé par un patient démarre `en_attente`.

## 2. Authentification

### 2.1 `POST /auth/login` — public

Corps :

```json
{ "email": "moussa.diop@jokkodent.sn", "password": "patient123" }
```

Réponse `200` :

```json
{
  "user": {
    "id": "u-patient-1",
    "first_name": "Moussa",
    "last_name": "Diop",
    "email": "moussa.diop@jokkodent.sn",
    "phone": "+221 77 452 89 10",
    "role": "patient",
    "dentist_id": null
  },
  "access_token": "eyJhbGciOi…"
}
```

`role` : `patient` | `dentist` | `admin`. `dentist_id` est **obligatoire** pour
un `dentist` (il rattache le compte à sa fiche) et vaut `null` pour un patient.

Rôles autorisés : public. Un compte `admin` doit être refusé avec
`403 ROLE_NOT_ALLOWED`. Le client refuse de toute façon une session `admin`,
même si le serveur la renvoie en `200` : aucune session n'est alors créée.

### 2.2 `POST /auth/register` — public

Crée **uniquement** un patient (A2). Le corps ne contient pas de rôle.

```json
{
  "first_name": "Ndèye",
  "last_name": "Diouf",
  "email": "ndeye.diouf@jokkodent.sn",
  "phone": "+221 78 604 22 37",
  "password": "…"
}
```

Réponse `201` : même enveloppe de session que le login. Erreurs :
`409 EMAIL_TAKEN`, `422 VALIDATION_ERROR`.

### 2.3 `POST /auth/logout` — patient, dentist

Réponse `204` sans corps. Le client vide sa session locale même si l'appel
échoue : la déconnexion ne dépend pas du réseau.

## 3. Catalogue et praticiens (publics)

Ces trois lectures ne demandent aucune session : un patient choisit son soin et
son praticien avant de se connecter.

| Méthode | Route | Rôle | Réponse |
|---|---|---|---|
| `GET` | `/dentists` | public | `DentistDto[]` |
| `GET` | `/dentists/{dentistId}` | public | `DentistDto` |
| `GET` | `/services` | public | `ServiceDto[]` |
| `GET` | `/services?category=Prevention` | public | `ServiceDto[]` |
| `GET` | `/services/{serviceId}` | public | `ServiceDto` |

`DentistDto` :

```json
{ "id": "dentist-ndiaye", "first_name": "Aminata", "last_name": "Ndiaye",
  "specialty": "Chirurgien-Dentiste & Esthétique", "rating": 4.95 }
```

`ServiceDto` :

```json
{ "id": "service-detartrage", "name": "Détartrage & Polissage",
  "category": "Prevention", "description": "…",
  "duration_minutes": 45, "price_fcfa": 25000, "popular": true }
```

`category` : `Prevention` | `Soins` | `Esthetique` | `Chirurgie` | `Urgence`.
`price_fcfa` est un entier : le client formate en `25 000 FCFA`.

> Hypothèse de données : le prix de `Urgence Dentaire & Soulagement` n'est pas
> donné par le cahier des charges. La valeur `20000` utilisée par les mocks est un
> ordre de grandeur à confirmer avec le cabinet — les autres montants sont ceux
> du cahier des charges.

## 4. Disponibilités

### 4.1 `GET /dentists/{dentistId}/availability` — public

```json
{
  "days": [
    { "weekday": 0, "start_minutes": 540, "end_minutes": 1020,
      "breaks": [{ "start_minutes": 780, "end_minutes": 840 }] },
    { "weekday": 2, "start_minutes": 540, "end_minutes": 780, "breaks": [] }
  ]
}
```

(Exemples : lundi 09:00–17:00 avec pause 13:00–14:00, mercredi 09:00–13:00.)

`weekday` : `0` = lundi … `6` = dimanche (`Date#getDay() - 1`).
**Seuls les jours ouverts sont renvoyés** : une semaine entièrement fermée est
`{"days": []}`, ce que le client reconstruit en sept jours fermés.

### 4.2 `PUT /dentists/{dentistId}/availability` — dentist (sa propre fiche)

Corps : même forme que la lecture, seuls les jours ouverts.

```json
{ "days": [ { "weekday": 0, "start_minutes": 540, "end_minutes": 1020, "breaks": [] } ] }
```

Réponse `200` : les disponibilités enregistrées, après validation par le serveur
(`start < end`, pauses dans la plage, pas de pause hors plage). Un praticien qui
ferme un jour voit ses créneaux disparaître immédiatement côté patient.

## 5. Rendez-vous

Toutes ces routes sont authentifiées. Un patient n'obtient que ses rendez-vous,
un praticien que les siens ; toute autre lecture renvoie `403 FORBIDDEN`.

| Méthode | Route | Rôle | Corps | Réponse |
|---|---|---|---|---|
| `GET` | `/patients/{patientId}/appointments` | patient (lui-même), dentist | — | `AppointmentDto[]` |
| `GET` | `/dentists/{dentistId}/appointments` | dentist (lui-même), patient | — | `AppointmentDto[]` |
| `GET` | `/appointments/{id}` | propriétaire | — | `AppointmentDto` |
| `POST` | `/appointments` | patient | création | `201 AppointmentDto` |
| `POST` | `/appointments/{id}/confirm` | dentist | — | `200 AppointmentDto` |
| `POST` | `/appointments/{id}/complete` | dentist | — | `200 AppointmentDto` |
| `POST` | `/appointments/{id}/cancel` | patient ou dentist | `{ "actor": "patient" }` | `200 AppointmentDto` |

Création (`POST /appointments`) :

```json
{
  "patient_id": "u-patient-1",
  "dentist_id": "dentist-ndiaye",
  "service_id": "service-detartrage",
  "start_at": "2026-10-05T14:00:00.000Z",
  "motif": "Sensibilité au chaud et au froid",
  "created_by": "patient"
}
```

`motif` est facultatif (200 caractères maximum). `created_by` vaut `"patient"` :
c'est ce qui fixe le statut de départ à `en_attente` (A8.6). La durée n'est pas
envoyée — le serveur la lit dans le catalogue (A8.3).

`AppointmentDto` :

```json
{
  "id": "rdv-12",
  "patient_id": "u-patient-1",
  "dentist_id": "dentist-ndiaye",
  "service_id": "service-detartrage",
  "start_at": "2026-10-05T14:00:00.000Z",
  "end_at": "2026-10-05T14:45:00.000Z",
  "status": "en_attente",
  "motif": null,
  "created_at": "2026-10-01T09:12:00.000Z",
  "updated_at": "2026-10-01T09:12:00.000Z"
}
```

`status` : `en_attente` | `confirme` | `annule` | `termine`. Une valeur inconnue
fait échouer la lecture d'un écran entier (plutôt que d'afficher un `undefined`).

`actor` distingue qui demande l'annulation : le patient est soumis à la fenêtre
de 24 h, le praticien non.

## 6. Patients (réservés au praticien)

| Méthode | Route | Rôle | Réponse |
|---|---|---|---|
| `GET` | `/patients` | dentist | `PatientDto[]` |
| `GET` | `/dentists/{dentistId}/patients` | dentist | `PatientSummaryDto[]` |
| `GET` | `/patients/{id}` | dentist | `PatientDto` |

`PatientDto` — identité et téléphone uniquement : le cahier des charges interdit
les dossiers médicaux détaillés sur mobile (A3).

```json
{ "id": "u-patient-1", "first_name": "Moussa", "last_name": "Diop",
  "phone": "+221 77 452 89 10" }
```

`PatientSummaryDto` ajoute l'historique agrégé par le serveur :

```json
{ "id": "u-patient-1", "first_name": "Moussa", "last_name": "Diop",
  "phone": "+221 77 452 89 10", "visit_count": 3, "upcoming_count": 1,
  "last_visit_at": "2026-09-23T10:00:00.000Z", "next_visit_at": "2026-10-05T14:00:00.000Z" }
```

`last_visit_at` et `next_visit_at` valent `null` s'il n'y a rien à afficher.

## 7. Comportement du client HTTP

`services/http/` est l'unique couche qui connaît le transport :

- `baseURL` = `EXPO_PUBLIC_API_URL`, sans barre oblique finale ;
- délai d'attente : 15 s, passé en quoi l'erreur `NETWORK` avec le message
  « Le cabinet ne répond pas. Réessayez dans un instant. » ;
- `Accept: application/json`, `Content-Type` seulement s'il y a un corps ;
- `Authorization: Bearer …` joint à toute requête, sauf si la route est publique
  au sens de l'authentification (login, inscription) ;
- une réponse `204` ou un corps vide renvoie `undefined` ;
- une réponse `401` sur une requête authentifiée vide le jeton : `AuthProvider`
  ferme la session et la garde renvoie à la page vitrine ;
- un échec réseau ou un délai dépassé devient `NETWORK` ;
- une réponse illisible (ni JSON, ni enveloppe d'erreur) devient `UNKNOWN` avec
  un message français par défaut.

## 8. Bascule mocks / API

`EXPO_PUBLIC_USE_MOCKS` choisit l'implémentation dans le `index.ts` de chaque
domaine. Passer à `false` ne demande **aucune** modification de composant ni
d'écran : les hooks importent toujours `authService`, `appointmentsService`,
`availabilityService`, `catalogService`, `dentistsService`, `patientsService`.

Les mocks reproduisent les mêmes codes d'erreur, avec une latence simulée : une
erreur affichée en développement existe aussi en production.
