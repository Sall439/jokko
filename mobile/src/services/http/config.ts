/**
 * Configuration du client HTTP, lue dans les variables `EXPO_PUBLIC_*` (A7).
 *
 * Ces variables sont figées au bundling : les lire ici, une seule fois, évite
 * qu'un écran dépende de l'environnement. Rien d'autre dans l'application ne
 * référence `process.env`.
 */

/** Paramètres de requête, sérialisés en query string. */
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/** Délai au-delà duquel une requête est abandonnée. */
export const REQUEST_TIMEOUT_MS = 15000;

/**
 * `EXPO_PUBLIC_USE_MOCKS` : à `false`, les services `*.service.api.ts` speak
 * à l'API REST. Le choix est fait une fois, ici et dans les `index.ts` des
 * domaines — aucun écran ni hook ne connaît l'implémentation.
 */
export const USE_MOCKS = (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'true').toLowerCase() !== 'false';

/** Racine de l'API, sans barre oblique finale. */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

/** L'API est-elle déclarée ? Une URL absente est une erreur de configuration. */
export const IS_API_CONFIGURED = API_BASE_URL.length > 0;

export function buildQueryString(params?: QueryParams): string {
  if (!params) return '';

  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return pairs.length ? `?${pairs.join('&')}` : '';
}

/** URL complète d'une route d'API : `/dentists/dentist-ndiaye?full=1`. */
export function apiUrl(path: string, params?: QueryParams): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}${buildQueryString(params)}`;
}
