import { apiGet, apiPost, pathId } from '@/services/http/client';
import type { Appointment } from '@/types/appointment';

import {
  mapAppointmentDto,
  type AppointmentDto,
  type AppointmentRequestDto,
} from './appointments.mapper';
import type { IAppointmentsService, RequestAppointmentInput } from './appointments.service.mock';

/**
 * Service des rendez-vous sur l'API REST (A7).
 *
 * Les règles de l'agenda (A8) sont appliquées **par le serveur** : c'est lui
 * qui connaît les rendez-vous des autres patients et des autres praticiens.
 * Le client continue d'afficher des créneaux libres calculés localement — la
 * grille reste instantanée — mais toute réservation passe par une vérification
 * serveur, et c'est sa réponse qui fait foi. Un créneau devenu libre entre
 * l'affichage et le clic est donc refusé proprement, avec `SLOT_UNAVAILABLE`.
 *
 * `durationMinutes` et `availabilityResolver` ne sont pas transmis : la durée
 * d'un soin se lit dans le catalogue côté serveur (A8.3) et les disponibilités
 * y sont déjà enregistrées (A8.2).
 */

/** Corps d'une transition : l'API distingue qui demande l'annulation (A8.4). */
interface CancelBody {
  actor: 'patient' | 'dentist';
}

function toStartIso(date: Date, startMinutes: number): string {
  const start = new Date(date);
  start.setHours(0, startMinutes, 0, 0);
  return start.toISOString();
}

function transition(id: string, action: string, body?: unknown): Promise<Appointment> {
  return apiPost<AppointmentDto>(`/appointments/${pathId(id)}/${action}`, body).then(
    mapAppointmentDto,
  );
}

export const apiAppointmentsService: IAppointmentsService = {
  listForPatient(patientId) {
    return apiGet<AppointmentDto[]>(`/patients/${pathId(patientId)}/appointments`).then((dtos) =>
      dtos.map(mapAppointmentDto),
    );
  },

  listForDentist(dentistId) {
    return apiGet<AppointmentDto[]>(`/dentists/${pathId(dentistId)}/appointments`).then((dtos) =>
      dtos.map(mapAppointmentDto),
    );
  },

  getById(id) {
    return apiGet<AppointmentDto>(`/appointments/${pathId(id)}`).then(mapAppointmentDto);
  },

  requestAppointment(input: RequestAppointmentInput) {
    const body: AppointmentRequestDto = {
      patient_id: input.patientId,
      dentist_id: input.dentistId,
      service_id: input.serviceId,
      start_at: toStartIso(input.date, input.startMinutes),
      ...(input.motif?.trim() ? { motif: input.motif.trim() } : {}),
      // A8.6 : une demande de patient démarre toujours « en attente ».
      created_by: 'patient',
    };

    return apiPost<AppointmentDto>('/appointments', body).then(mapAppointmentDto);
  },

  confirm(id) {
    return transition(id, 'confirm');
  },

  complete(id) {
    return transition(id, 'complete');
  },

  cancelByDentist(id) {
    const body: CancelBody = { actor: 'dentist' };
    return transition(id, 'cancel', body);
  },

  cancelByPatient(id) {
    const body: CancelBody = { actor: 'patient' };
    return transition(id, 'cancel', body);
  },
};
