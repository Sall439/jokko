import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { authService } from '@/services/auth';
import { clearStoredSession, loadSession, saveSession } from '@/services/auth/session-store';
import { subscribeToAccessToken } from '@/services/http/token-store';
import type { AuthSession, LoginPayload, RegisterPayload, User } from '@/types/auth';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';

/**
 * Session de l'application (A6.5, A7).
 *
 * La session est relue au démarrage dans le coffre du système : un cabinet
 * n'oblige pas un patient à se reconnecter à chaque ouverture. Tant que cette
 * lecture n'a pas abouti, `status` vaut `loading` — c'est ce qui évite à la
 * garde de navigation de renvoyer vers la vitrine un utilisateur qui, lui, est
 * encore connecté.
 *
 * Le transport peut invalider le jeton à tout moment (expiration, compte
 * désactivé) : l'abonnement au jeton ferme alors la session, et la garde fait
 * le reste.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restored, setRestored] = useState(false);
  // Évite qu'un état obsolète ne soit écrit si le composant se démonte
  // pendant une requête (démontage immédiat après connexion).
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await loadSession();
      if (cancelled) return;

      setUser(session?.user ?? null);
      setRestored(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Un jeton-invalidé par l'API vaut déconnexion : l'utilisateur n'a plus de
  // session, quel que soit l'écran affiché.
  useEffect(
    () =>
      subscribeToAccessToken((token) => {
        if (token === null && mounted.current) setUser(null);
      }),
    [],
  );

  const openSession = useCallback(async (session: AuthSession) => {
    await saveSession(session);
    if (mounted.current) setUser(session.user);
    return session.user;
  }, []);

  const signIn = useCallback(
    (payload: LoginPayload) => authService.login(payload).then(openSession),
    [openSession],
  );

  const signUp = useCallback(
    (payload: RegisterPayload) => authService.register(payload).then(openSession),
    [openSession],
  );

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Même si l'API ne répond pas, l'utilisateur doit pouvoir sortir de son
      // compte : le coffre est vidé quoi qu'il arrive.
      await clearStoredSession();
      if (mounted.current) setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const status: AuthStatus = user ? 'authenticated' : restored ? 'unauthenticated' : 'loading';
    return { status, user, signIn, signUp, signOut };
  }, [user, restored, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
