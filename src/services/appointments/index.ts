import { getServiceById } from '@/mocks/services';
import { availabilityService } from '@/services/availability';
import { USE_MOCKS } from '@/services/http/config';

import { apiAppointmentsService } from './appointments.service.api';
import type { IAppointmentsService, RequestAppointmentInput } from './appointments.service.mock';
import { mockAppointmentsService } from './appointments.service.mock';

export type { IAppointmentsService } from './appointments.service.mock';
export type { RequestAppointmentInput } from './appointments.service.mock';

/**
 * Adaptateur du mock : l'application ne fournit plus à la main la durée du soin
 * ni les disponibilités, cette fonction de couture les injecte une fois pour
 * toutes. Les tests appellent `appointments.service.mock` directement, avec
 * leurs propres données.
 *
 * Côté API, ces deux informations sont lues par le serveur : rien à injecter.
 */
function mockWithResolvers(): IAppointmentsService {
  return {
    ...mockAppointmentsService,

    /**
     * La durée vient du catalogue, les disponibilités du service dédié : les
     * deux sont relus au moment de la réservation, donc une modification faite
     * dans l'espace dentiste est prise en compte immédiatement.
     */
    requestAppointment(input: RequestAppointmentInput) {
      return mockAppointmentsService.requestAppointment({
        durationMinutes: getServiceById(input.serviceId)?.durationMinutes,
        availabilityResolver: (dentistId) => availabilityService.getWeekly(dentistId),
        ...input,
      });
    },
  };
}

/**
 * Point d'entrée unique du domaine « rendez-vous ».
 *
 * L'implémentation est choisie selon `EXPO_PUBLIC_USE_MOCKS` : les écrans et
 * les hooks utilisent toujours `appointmentsService`, jamais une version
 * particulière du service.
 */
export const appointmentsService: IAppointmentsService = USE_MOCKS
  ? mockWithResolvers()
  : apiAppointmentsService;
