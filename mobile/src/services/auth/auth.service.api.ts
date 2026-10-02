import { apiPost } from '@/services/http/client';
import { isApiError } from '@/services/http/errors';
import { clearAccessToken, setAccessToken } from '@/services/http/token-store';
import { DomainError } from '@/services/errors';
import { ADMIN_MOBILE_REFUSAL } from '@/utils/roles';
import type { AuthSession } from '@/types/auth';

import {
  mapAuthSessionDto,
  type AuthSessionDto,
  type CredentialsDto,
  type RegisterDto,
} from './auth.mapper';
import { AuthError, type AuthErrorCode, type IAuthService } from './auth.service';

/**
 * Service d'authentification sur l'API REST (A7).
 *
 * Mêmes règles que le mock, mais la décision appartient au serveur : c'est lui
 * qui connaît les mots de passe et les rôles. L'application ne fait que
 * traduire sa réponse en codes d'erreur, et refuse en plus toute session qui ne
 * serait pas mobile — la règle A2 ne dépend donc jamais du seul backend.
 */

/** Codes d'authentification que l'API peut renvoyer dans `error.code`. */
const AUTH_ERROR_CODES: AuthErrorCode[] = [
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'ROLE_NOT_ALLOWED',
  'UNKNOWN',
];

/**
 * Traduit une erreur de transport en erreur d'authentification.
 *
 * Idempotente : une `AuthError` déjà produite par ce service ressort telle
 * quelle. Sans cette étape, le refus d'accès d'une session `admin` (A2) serait
 * ré-emballé en `UNKNOWN` et l'utilisateur verrait « connexion impossible »
 * au lieu du motif de refus.
 *
 * Le message de transport est conservé : « Impossible de joindre le cabinet »
 * doit s'afficher tel quel sur l'écran de connexion, quel que soit le code. La
 * seule exception est le refus d'accès, dont la formulation est imposée par A2 :
 * elle est écrite ici, pas par l'API.
 */
function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;

  if (isApiError(error)) {
    const rawCode = error.rawCode ?? error.code;
    const code = (AUTH_ERROR_CODES as string[]).includes(rawCode)
      ? (rawCode as AuthErrorCode)
      : 'UNKNOWN';

    if (code === 'ROLE_NOT_ALLOWED') return new AuthError(code, ADMIN_MOBILE_REFUSAL);

    return new AuthError(code, error.message);
  }

  return new AuthError(
    'UNKNOWN',
    error instanceof Error ? error.message : 'Connexion impossible. Réessayez.',
  );
}

/**
 * Ouvre une session renvoyée par l'API, après avoir vérifié qu'elle est
 * bienvenue sur mobile (A2).
 */
function openSession(dto: AuthSessionDto): AuthSession {
  const session = mapAuthSessionDto(dto);

  if (session.user.role === 'admin') {
    // Aucun jeton n'est enregistré : l'utilisateur reste déconnecté.
    clearAccessToken();
    throw new AuthError('ROLE_NOT_ALLOWED', ADMIN_MOBILE_REFUSAL);
  }

  setAccessToken(session.accessToken);
  return session;
}

export const apiAuthService: IAuthService = {
  async login(payload) {
    const body: CredentialsDto = {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    };

    try {
      // `auth: false` : il n'y a pas encore de jeton à joindre à la requête.
      return openSession(await apiPost<AuthSessionDto>('/auth/login', body, { auth: false }));
    } catch (error) {
      throw toAuthError(error);
    }
  },

  async register(payload) {
    const body: RegisterDto = {
      first_name: payload.firstName.trim(),
      last_name: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      password: payload.password,
    };

    try {
      const session = openSession(
        await apiPost<AuthSessionDto>('/auth/register', body, { auth: false }),
      );

      // A2 : l'inscription publique crée uniquement des patients. Un rôle autre
      // que `patient` signifie que la requête a été truquée ou que l'API a
      // changé de règle : dans les deux cas, aucune session n'est conservée.
      if (session.user.role !== 'patient') {
        clearAccessToken();
        throw new DomainError(
          'FORBIDDEN',
          "L'inscription publique crée uniquement un compte patient.",
        );
      }

      return session;
    } catch (error) {
      throw toAuthError(error);
    }
  },

  async logout() {
    try {
      await apiPost<void>('/auth/logout');
    } finally {
      // La déconnexion locale ne dépend pas du réseau : un utilisateur doit
      // pouvoir quitter son compte même si le cabinet est injoignable.
      clearAccessToken();
    }
  },
};
