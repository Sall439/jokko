import { apiGet, pathId } from '@/services/http/client';

import { mapServiceDto, type ServiceDto } from './catalog.mapper';
import type { ICatalogService } from './catalog.service.mock';

/**
 * Service du catalogue de soins sur l'API REST (A7).
 *
 * La liste est publique : pas de jeton nécessaire, le catalogue est le même
 * pour tous et n'a rien de personnel.
 */
export const apiCatalogService: ICatalogService = {
  list() {
    return apiGet<ServiceDto[]>('/services').then((dtos) => dtos.map(mapServiceDto));
  },

  getById(id) {
    return apiGet<ServiceDto>(`/services/${pathId(id)}`).then(mapServiceDto);
  },

  listByCategory(category) {
    return apiGet<ServiceDto[]>('/services', { category }).then((dtos) => dtos.map(mapServiceDto));
  },
};
