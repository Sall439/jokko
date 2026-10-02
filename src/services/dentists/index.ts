import { USE_MOCKS } from '@/services/http/config';

import { apiDentistsService } from './dentists.service.api';
import type { IDentistsService } from './dentists.service.mock';
import { mockDentistsService } from './dentists.service.mock';

export type { IDentistsService } from './dentists.service.mock';

/**
 * Point d'entrée unique du domaine « praticiens ».
 * Les écrans importent `dentistsService` et ignorent l'implémentation.
 */
export const dentistsService: IDentistsService = USE_MOCKS
  ? mockDentistsService
  : apiDentistsService;
