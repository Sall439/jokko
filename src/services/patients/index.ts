import { USE_MOCKS } from '@/services/http/config';

import { apiPatientsService } from './patients.service.api';
import type { IPatientsService } from './patients.service.mock';
import { mockPatientsService } from './patients.service.mock';

export type { IPatientsService } from './patients.service.mock';
export type { Patient, PatientSummary } from './patients.service.mock';

/**
 * Point d'entrée unique du domaine « patients ».
 * L'implémentation suit `EXPO_PUBLIC_USE_MOCKS`, sans impact sur les écrans.
 */
export const patientsService: IPatientsService = USE_MOCKS
  ? mockPatientsService
  : apiPatientsService;
