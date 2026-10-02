import { DomainError } from '@/services/errors';

import { IS_API_CONFIGURED, REQUEST_TIMEOUT_MS, apiUrl, type QueryParams } from './config';
import { buildApiError, networkError } from './errors';
import { clearAccessToken, getAccessToken } from './token-store';

/**
 * Client HTTP unique de l'application (A7).
 *
 * Un seul endroit connaît le transport : URL de base, en-têtes, délai
 * d'attente, forme des erreurs. Les services de domaine ne font qu'appeler
 * `apiGet` / `apiPost` et traduire le DTO reçu en modèle du client.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  /** Envoyé en JSON. `undefined` = corps vide. */
  body?: unknown;
  query?: QueryParams;
  /**
   * `false` pour la connexion et l'inscription : aucun jeton n'existe encore.
   * Par défaut, le jeton courant est joint à la requête s'il y en a un.
   */
  auth?: boolean;
  /** Surcharge du délai d'attente, réservée aux tests. */
  timeoutMs?: number;
}

/** Message affiché quand aucune réponse n'est arrivée. */
const NETWORK_MESSAGE = 'Impossible de joindre le cabinet. Vérifiez votre connexion internet.';
const TIMEOUT_MESSAGE = 'Le cabinet ne répond pas. Réessayez dans un instant.';

/**
 * Une session peut être invalidée par l'API pendant que l'utilisateur navigue
 * (jeton expiré, compte désactivé). Le `401` vide alors le jeton : l'abonné
 * — `AuthProvider` — ferme la session et la garde renvoie à la vitrine.
 */
function handleUnauthorized(): void {
  if (!getAccessToken()) return;
  clearAccessToken();
}

async function readPayload(response: Response): Promise<unknown> {
  // 204 et réponses vides : rien à lire, et `json()` planterait.
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!IS_API_CONFIGURED) {
    throw new DomainError(
      'UNKNOWN',
      "L'API n'est pas configurée. Renseignez EXPO_PUBLIC_API_URL dans le fichier .env.",
    );
  }

  const { method = 'GET', body, query, auth = true, timeoutMs = REQUEST_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetch(apiUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    // `fetch` ne rejette que sur un échec réseau ou une annulation : dans les
    // deux cas aucun octet de réponse n'a été exploitable.
    throw networkError(timedOut ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
  } finally {
    clearTimeout(timer);
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw buildApiError(response.status, payload);
  }

  return payload as T;
}

/** Options communes aux raccourcis ci-dessous : tout sauf méthode et corps. */
type ShortcutOptions = Omit<RequestOptions, 'method' | 'body'>;

export function apiGet<T>(
  path: string,
  query?: QueryParams,
  options: ShortcutOptions = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, query });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options: ShortcutOptions = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'POST', body });
}

export function apiPut<T>(path: string, body?: unknown, options: ShortcutOptions = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'PUT', body });
}

/** Encode un identifiant pour une route : les identifiants viennent de l'API. */
export function pathId(id: string): string {
  return encodeURIComponent(id);
}
