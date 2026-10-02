import { apiGet, pathId } from '@/services/http/client';

import { mapDentistDto, type DentistDto } from './dentists.mapper';
import type { IDentistsService } from './dentists.service.mock';

/**
 * Service des praticiens sur l'API REST (A7).
 *
 * Liste publique, comme le catalogue : un patient choisit son praticien avant
 * d'être connecté.
 */
export const apiDentistsService: IDentistsService = {
  list() {
    return apiGet<DentistDto[]>('/dentists').then((dtos) => dtos.map(mapDentistDto));
  },

  getById(id) {
    return apiGet<DentistDto>(`/dentists/${pathId(id)}`).then(mapDentistDto);
  },
};
