import type { AuthSession, LoginPayload, RegisterPayload } from '@/types/auth';

/** Codes d'erreur métier partagés entre le mock et l'API (A7). */
export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'ROLE_NOT_ALLOWED' | 'UNKNOWN';

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/** Contrat du service : implémenté par le mock aujourd'hui, par l'API REST en Phase 7. */
export interface IAuthService {
  login(payload: LoginPayload): Promise<AuthSession>;
  register(payload: RegisterPayload): Promise<AuthSession>;
  logout(): Promise<void>;
}
