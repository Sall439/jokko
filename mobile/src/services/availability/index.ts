import { USE_MOCKS } from '@/services/http/config';

import { apiAvailabilityService } from './availability.service.api';
import type { IAvailabilityService } from './availability.service.mock';
import { mockAvailabilityService } from './availability.service.mock';

export type { IAvailabilityService } from './availability.service.mock';
export { openWeekdays } from './availability.service.mock';

/**
 * Point d'entrée unique du domaine « disponibilités ».
 *
 * L'implémentation suit `EXPO_PUBLIC_USE_MOCKS` : même écran, même hook, même
 * contrat, que les disponibilités soient en mémoire ou sur l'API.
 */
export const availabilityService: IAvailabilityService = USE_MOCKS
  ? mockAvailabilityService
  : apiAvailabilityService;
