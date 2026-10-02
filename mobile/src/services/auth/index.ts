import { USE_MOCKS } from '@/services/http/config';

import { apiAuthService } from './auth.service.api';
import type { IAuthService } from './auth.service';
import { mockAuthService } from './auth.service.mock';

export * from './auth.service';
export type { AuthSessionDto, UserDto } from './auth.mapper';

/**
 * Point d'entrée unique de l'authentification (A7).
 *
 * L'implémentation est choisie ici, une fois pour toutes, à partir de
 * `EXPO_PUBLIC_USE_MOCKS`. Passer à l'API réelle ne demande donc aucune
 * modification d'écran, de hook ni de composant.
 */
export const authService: IAuthService = USE_MOCKS ? mockAuthService : apiAuthService;
