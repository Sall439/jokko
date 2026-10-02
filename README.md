# JokkoDentiste — application mobile

Application de prise de rendez-vous du **Cabinet Dentaire JokkoDentiste**
(Sénégal). Deux espaces, deux rôles : **patient** et **dentiste**. Il n'existe
pas d'espace administrateur ni secrétariat sur mobile — ces interfaces sont
réservées à la version web.

- Prise de rendez-vous en quatre étapes : dentiste, soin, créneau, confirmation.
- Suivi des rendez-vous, annulation en ligne jusqu'à 24 h avant.
- Espace praticien : agenda du jour, demandes à valider, plages de travail
  hebdomadaires, annuaire des patients suivis.
- Aucun paiement en ligne, aucune messagerie, aucune téléconsultation : le
  paiement se fait sur place, au cabinet.

## Installation

Prérequis : Node 20+ et npm.

```bash
npm install
cp .env.example .env     # puis adapter EXPO_PUBLIC_API_URL si besoin
npm start                # puis « a », « i » ou scanner le QR code avec Expo Go
```

L'application fonctionne dans **Expo Go** : aucun build natif n'est nécessaire
(`expo-network` et `expo-secure-store` sont des modules fournis avec Expo Go).

Commandes utiles :

```bash
npm start            # serveur de développement
npm run android      # ouvre sur un émulateur Android
npm run ios          # ouvre sur le simulateur iOS
npm run web          # version web (utile pour un aperçu rapide)
```

## Variables d'environnement

Toutes les variables lues par l'application sont préfixées `EXPO_PUBLIC_` et sont
figées au moment du bundling. Ne jamais y mettre de secret.

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Racine de l'API REST, sans barre oblique finale | *(vide)* |
| `EXPO_PUBLIC_USE_MOCKS` | `true` = services mock, `false` = API réelle | `true` |

## Comptes de démonstration

Ces comptes sont disponibles en développement sur l'écran de connexion (masqués
en production). Le compte `admin` existe pour vérifier le refus d'accès : il ne
crée aucune session.

| Espace | Email | Mot de passe |
|---|---|---|
| Patient | `moussa.diop@jokkodent.sn` | `patient123` |
| Dentiste | `aminata.ndiaye@jokkodent.sn` | `dentist123` |
| Administration (refusé) | `aissatou.ba@jokkodent.sn` | `admin123` |

## Brancher l'API réelle

1. Renseigner `EXPO_PUBLIC_API_URL` et `EXPO_PUBLIC_USE_MOCKS=false` dans `.env`.
2. Redémarrer le serveur de développement : `npm start --clear`.
3. Implémenter le backend conformément à [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

Aucune modification de composant ni d'écran n'est nécessaire : chaque domaine a
une interface (`IXxxService`), une implémentation mock (`*.service.mock.ts`), une
implémentation API (`*.service.api.ts`) et un `index.ts` qui choisit selon
`EXPO_PUBLIC_USE_MOCKS`. Les écrans et les hooks importent toujours le service
exposé par l'`index.ts`.

Les règles de gestion (chevauchement, créneaux, transitions, annulation à 24 h)
sont appliquées par le serveur : le client les réapplique pour l'affichage
instantanée, mais c'est la réponse de l'API qui fait foi.

## Données de démonstration : hypothèses

Les tarifs de `src/mocks/services.ts` servent uniquement au développement. Un
seul prix n'est pas fourni par le cahier des charges : **« Urgence Dentaire &
Soulagement » est affiché à 20 000 FCFA**, valeur chosen comme ordre de grandeur
et à confirmer avec le cabinet. Elle est centralisée à un seul endroit
(`SEED_SERVICES`) : la corriger ne demande qu'une ligne.

Tous les autres montants (`25 000`, `15 000`, `35 000`, `80 000`, `40 000 FCFA`)
proviennent du cahier des charges.

## Structure du projet

```
src/
├── app/                        # routage uniquement (Expo Router)
│   ├── _layout.tsx             # polices, AuthProvider, garde de navigation
│   ├── index.tsx               # écran d'attente
│   ├── (auth)/                 # landing, login, register, forgot-password
│   ├── (patient)/              # book, appointments, services, account
│   └── (dentist)/              # agenda, pending, availability, patients
├── components/
│   ├── ui/                     # composants purs : Button, TextField, Badge…
│   ├── layout/                 # Screen, ScreenHeader, OfflineBanner
│   └── domain/                 # AppointmentCard, SlotGrid, ServiceCard…
├── constants/                  # brand.ts (charte), role-tabs.ts, cabinet-rules.ts
├── features/                   # hooks et composants métier par domaine
│   ├── auth/ booking/ appointments/ dentist/ network/ fonts/
├── mocks/                      # données de démonstration (B0)
├── services/                   # un dossier par domaine
│   └── <domaine>/              # interface + .mock + .api + mappers + index.ts
├── types/                      # modèles partagés
└── utils/                      # règles pures : slots, dates, rôles, monnaie…
```

Le sens des dépendances est strict : **écran → hook de feature → service → client
HTTP**. Un écran ne contient ni appel réseau ni règle métier ; un composant
`ui/` est pur (props entrantes, événements sortants) ; un fichier = une
responsabilité.

## Qualité du code

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (dont les règles du compilateur React)
npm run format         # prettier --write
npm test               # jest (règles métier et services)
npm run check          # les quatre, dans l'ordre — c'est ce que fait la CI
```

Les tests ciblent la logique métier pure (`utils/`, services mock, validation
des formulaires) : ce sont les règles qui décident si un créneau est proposable
ou si une transition est autorisée.

La CI (`.github/workflows/ci.yml`) exécute `npm run check` sur chaque push et
chaque pull request.

## Accessibilité et hors ligne

- Zones tactiles ≥ 44 px (`Brand.hitTarget`), libellés annoncés par le lecteur
  d'écran, états désactivés/sélectionnés exposés via `accessibilityState`.
- Bandeau « hors ligne » sous les deux bandeaux d'écran, alimenté par
  `expo-network` : il n'affirme pas la cause de la panne, seulement que
  l'affichage peut être incomplet.
- Tous les écrans qui chargent des données proposent un squelette puis un état
  d'erreur avec « Réessayer ».

## Charte graphique

`src/constants/brand.ts` est la **source unique** des couleurs, polices, rayons
et espacements. Aucune couleur en dur ailleurs ; les couleurs dérivées (fonds
d'encarts, textes secondaires) y sont également déclarées.
