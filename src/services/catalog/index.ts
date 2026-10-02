import { USE_MOCKS } from '@/services/http/config';

import { apiCatalogService } from './catalog.service.api';
import type { ICatalogService } from './catalog.service.mock';
import { mockCatalogService } from './catalog.service.mock';

export type { ICatalogService } from './catalog.service.mock';
export { mapServiceDto, type ServiceDto } from './catalog.mapper';

/**
 * Point d'entrée unique du domaine « catalogue ».
 *
 * Les écrans importent `catalogService` et ignorent l'implémentation : le
 * passage des mocks à l'API se fait ici, selon `EXPO_PUBLIC_USE_MOCKS`.
 */
export const catalogService: ICatalogService = USE_MOCKS ? mockCatalogService : apiCatalogService;
