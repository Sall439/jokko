import * as SecureStore from 'expo-secure-store';

import { clearAccessToken, setAccessToken } from '@/services/http/token-store';
import type { AuthSession } from '@/types/auth';
import { isRole } from '@/types/auth';

/**
 * Persistance de la session (A6.5, A7).
 *
 * La session contient le jeton d'accès : elle est donc écrite dans le
 * `SecureStore` d'Expo, le coffre du système (Keychain sur iOS, Keystore
 * chiffré sur Android), jamais en clair dans un fichier de preferences.
 *
 * `SecureStore` n'est disponible que sur les plateformes qui ont un coffre
 * (iOS, Android, Expo Go) : pas sur le web pendant le développement.
 * L'application ne casse pas pour autant — la session reste alors en mémoire,
 * ce qui est le comportement attendu pour une démonstration. Le même code sert
 * donc les deux environnements.
 */

const SESSION_KEY = 'jokkodentiste.session';

/** Copie en mémoire, utilisée quand le coffre n'est pas disponible. */
let memorySession: AuthSession | null = null;

/**
 * La donnée relue du disque a été écrite par une autre version de
 * l'application : on ne lui fait pas confiance sans vérifier sa forme.
 */
function parseSession(raw: string | null): AuthSession | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    const user = parsed?.user;

    if (typeof parsed?.accessToken !== 'string' || !user || !isRole(user.role)) return null;
    if (typeof user.id !== 'string' || typeof user.email !== 'string') return null;

    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  memorySession = session;
  setAccessToken(session.accessToken);

  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Coffre indisponible : la session reste valable pour ce lancement.
  }
}

/**
 * Relit la session au démarrage.
 *
 * Renvoie `null` s'il n'y a rien à restaurer, et vide le jeton dans ce cas :
 * l'application démarre alors réellement déconnectée, sans jeton fantôme.
 */
export async function loadSession(): Promise<AuthSession | null> {
  let stored: string | null = null;

  try {
    stored = await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return memorySession;
  }

  const session = parseSession(stored) ?? memorySession;
  if (!session) {
    clearAccessToken();
    return null;
  }

  setAccessToken(session.accessToken);
  return session;
}

/** Ouvre la session au transport sans la persister : utile aux tests. */
export function __setSessionInMemory(session: AuthSession | null): void {
  memorySession = session;
}

export async function clearStoredSession(): Promise<void> {
  memorySession = null;
  clearAccessToken();

  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Rien à nettoyer : la session est déjà fermée en mémoire.
  }
}
