import { apiGet, pathId } from '@/services/http/client';

import {
  mapPatientDto,
  mapPatientSummaryDto,
  type PatientDto,
  type PatientSummaryDto,
} from './patients.mapper';
import type { IPatientsService } from './patients.service.mock';

/**
 * Service des patients sur l'API REST (A7).
 *
 * Toutes les lectures sont réservées aux praticiens : l'annuaire du cabinet
 * n'est pas une donnée publique, et l'API répond `403` à un patient qui
 * l'interrogerait. Le client ne fait qu'exposer l'erreur telle quelle.
 */
export const apiPatientsService: IPatientsService = {
  list() {
    return apiGet<PatientDto[]>('/patients').then((dtos) => dtos.map(mapPatientDto));
  },

  listForDentist(dentistId) {
    return apiGet<PatientSummaryDto[]>(`/dentists/${pathId(dentistId)}/patients`).then((dtos) =>
      dtos.map(mapPatientSummaryDto),
    );
  },

  getById(id) {
    return apiGet<PatientDto>(`/patients/${pathId(id)}`).then(mapPatientDto);
  },
};
