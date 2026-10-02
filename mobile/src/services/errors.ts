/**
 * Codes d'erreur métier partagés par les mocks et l'API REST (A7).
 *
 * Les écrans testent le `code`, jamais le `message` : un texte peut être
 * corrigé côté API ou traduit sans casser l'application.
 */
export type DomainErrorCode =
  // Règles de rendez-vous (A8)
  | 'SLOT_UNAVAILABLE'
  | 'SLOT_IN_PAST'
  | 'OVERLAP'
  | 'OUTSIDE_AVAILABILITY'
  | 'CANCELLATION_TOO_LATE'
  | 'INVALID_TRANSITION'
  // Authentification (A2, A6) : codes partagés par le mock et l'API
  /** Adresse email ou mot de passe incorrect. */
  | 'INVALID_CREDENTIALS'
  /** Adresse email déjà utilisée lors d'une inscription. */
  | 'EMAIL_TAKEN'
  /** Compte `admin` : refusé sur mobile, sans session créée. */
  | 'ROLE_NOT_ALLOWED'
  // Ressources et droits
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  /** Jeton absent, expiré ou révoqué : la session doit être fermée. */
  | 'UNAUTHORIZED'
  // Transport
  /** Aucun retour du serveur : hors ligne, DNS, API arrêtée. */
  | 'NETWORK'
  /** Réponse reçue mais illisible (ni JSON, ni erreur exploitable). */
  | 'UNKNOWN';

/**
 * Erreur métier normalisée. Le `code` est le contrat que l'API renvoie
 * également : les écrans testent le code, jamais le message.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

/** Latence simulée des mocks, pour que les états de chargement soient visibles. */
export const DEFAULT_MOCK_LATENCY_MS = 450;

let mockLatencyMs = DEFAULT_MOCK_LATENCY_MS;

/**
 * Règle la latence des mocks. Les tests la mettent à zéro : la latence n'est pas
 * une règle métier, la testerallongerait la suite sans rien garantir.
 */
export function setMockLatency(ms: number): void {
  mockLatencyMs = ms;
}

export function wait(ms?: number): Promise<void> {
  const delay = ms ?? mockLatencyMs;
  if (delay <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delay));
}
