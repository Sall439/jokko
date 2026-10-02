import { apiGet, apiPut, pathId } from '@/services/http/client';
import type { WeeklyAvailability } from '@/types/availability';

import {
  mapAvailabilityDto,
  toAvailabilityPayload,
  type AvailabilityDto,
} from './availability.mapper';
import type { IAvailabilityService } from './availability.service.mock';

/**
 * Service des disponibilités sur l'API REST (A7).
 *
 * La lecture est publique — un patient doit voir les plages avant de réserver —
 * mais l'écriture est refusée par l'API à quiconque n'est pas le praticien
 * concerné (A8.6) : le compte qui porte la modification est le seul juge de
 * cette règle, et le client ne l'invente pas.
 */
export const apiAvailabilityService: IAvailabilityService = {
  getWeekly(dentistId) {
    return apiGet<AvailabilityDto>(`/dentists/${pathId(dentistId)}/availability`).then(
      mapAvailabilityDto,
    );
  },

  setWeekly(dentistId, availability: WeeklyAvailability) {
    const body = toAvailabilityPayload(availability);

    return apiPut<AvailabilityDto>(`/dentists/${pathId(dentistId)}/availability`, body).then(
      mapAvailabilityDto,
    );
  },
};
