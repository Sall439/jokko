import { DomainError, type DomainErrorCode } from '@/services/errors';
import { ADMIN_MOBILE_REFUSAL } from '@/utils/roles';

/**
 * Traduction des réponses HTTP en erreurs métier (A7).
 *
 * L'API renvoie toujours la même enveloppe d'erreur :
 * `{ "error": { "code": "SLOT_UNAVAILABLE", "message": "…" } }`.
 * Le `code` est le contrat ; le `message` n'est qu'un confort d'affichage. Si
 * l'API envoie autre chose — ou rien du tout — on retombe sur un code et un
 * message français par défaut, jamais sur une exception brute : un écran qui
 * affiche `error.message` doit toujours avoir quelque chose à afficher.
 */
export class ApiError extends DomainError {
  /** Statut HTTP d'origine, utile pour distinguer 404 et 403 côté débogage. */
  readonly status: number;
  /** Code transmis par l'API, même s'il n'est pas encore connu du client. */
  readonly rawCode: string | undefined;

  constructor(status: number, code: DomainErrorCode, message: string, rawCode?: string) {
    super(code, message);
    this.name = 'ApiError';
    this.status = status;
    this.rawCode = rawCode;
  }
}

/** Codes connus du client : tout autre code est traité comme `UNKNOWN`. */
const KNOWN_CODES: DomainErrorCode[] = [
  'SLOT_UNAVAILABLE',
  'SLOT_IN_PAST',
  'OVERLAP',
  'OUTSIDE_AVAILABILITY',
  'CANCELLATION_TOO_LATE',
  'INVALID_TRANSITION',
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'ROLE_NOT_ALLOWED',
  'NOT_FOUND',
  'FORBIDDEN',
  'UNAUTHORIZED',
];

/** Message de repli par code, pour une API qui n'en fournit pas. */
const FALLBACK_MESSAGES: Partial<Record<DomainErrorCode, string>> = {
  SLOT_UNAVAILABLE: "Ce créneau n'est plus disponible.",
  SLOT_IN_PAST: 'Ce créneau est déjà passé. Choisissez une date à venir.',
  OVERLAP: 'Un autre rendez-vous occupe déjà ce créneau.',
  OUTSIDE_AVAILABILITY: 'Le cabinet ne travaille pas sur cette plage horaire.',
  CANCELLATION_TOO_LATE: "L'annulation n'est plus possible à moins de 24 heures du rendez-vous.",
  INVALID_TRANSITION: "Cette action n'est plus possible sur ce rendez-vous.",
  INVALID_CREDENTIALS: 'Adresse email ou mot de passe incorrect.',
  EMAIL_TAKEN: 'Cette adresse email est déjà utilisée.',
  ROLE_NOT_ALLOWED: ADMIN_MOBILE_REFUSAL,
  NOT_FOUND: "Cette donnée n'existe plus.",
  FORBIDDEN: "Vous n'avez pas accès à cette donnée.",
  UNAUTHORIZED: 'Votre session a expiré. Reconnectez-vous.',
  NETWORK: 'Impossible de joindre le cabinet. Vérifiez votre connexion internet.',
  UNKNOWN: 'Une erreur est survenue. Réessayez dans un instant.',
};

/** Code par défaut, selon le statut, quand l'API n'envoie pas de `code`. */
function codeForStatus(status: number): DomainErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  return 'UNKNOWN';
}

interface ErrorEnvelope {
  error?: { code?: unknown; message?: unknown };
}

function readEnvelope(payload: unknown): ErrorEnvelope | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelope = payload as ErrorEnvelope;
  return envelope.error && typeof envelope.error === 'object' ? envelope : null;
}

function asMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Construit l'erreur correspondant à une réponse en échec.
 *
 * `rawCode` est conservé tel quel : un service peut ainsi reconnaître un code
 * métier qui lui est propre (`ROLE_NOT_ALLOWED` pour la connexion) sans que
 * l'erreur soit reclassée en `UNKNOWN`.
 */
export function buildApiError(status: number, payload: unknown): ApiError {
  const envelope = readEnvelope(payload);
  const rawCode = typeof envelope?.error?.code === 'string' ? envelope.error.code : undefined;

  const code: DomainErrorCode =
    rawCode && (KNOWN_CODES as string[]).includes(rawCode)
      ? (rawCode as DomainErrorCode)
      : codeForStatus(status);

  const message =
    asMessage(envelope?.error?.message) ?? FALLBACK_MESSAGES[code] ?? FALLBACK_MESSAGES.UNKNOWN!;

  return new ApiError(status, code, message, rawCode);
}

/** Erreur de transport : aucun octet n'est revenu de l'API. */
export function networkError(message: string): DomainError {
  return new DomainError('NETWORK', message);
}

/**
 * `ApiError` reste un `DomainError` : les écrans et les tests des mocks
 * n'ont donc jamais à connaître le transport pour traiter une erreur d'API.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
