/**
 * Jeton d'accès du client HTTP (A7).
 *
 * Volontairement isolé : le client HTTP ne connaît que le jeton, pas
 * l'utilisateur. `AuthProvider` gère la session (utilisateur + jeton) et
 * s'abonne ici pour être prévenu quand le transport invalide le jeton — c'est
 * ainsi qu'un `401` renvoyé au milieu d'un écran ramène l'utilisateur à la
 * vitrine au lieu de laisser une interface à moitié vide.
 */

let accessToken: string | null = null;

const listeners = new Set<(token: string | null) => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

function notify(): void {
  for (const listener of listeners) listener(accessToken);
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  notify();
}

/** Ouvre le transport : plus aucune requête ne portera de jeton. */
export function clearAccessToken(): void {
  setAccessToken(null);
}

/**
 * Abonne un écouteur aux changements de jeton. La fonction retournée permet de
 * se désabonner, sans quoi un remontage de l'écran empilerait des écouteurs.
 */
export function subscribeToAccessToken(listener: (token: string | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Vide le jeton : utilisé par les tests. */
export function __resetAccessToken(): void {
  accessToken = null;
  listeners.clear();
}
