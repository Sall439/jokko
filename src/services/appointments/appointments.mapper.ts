import { DomainError } from '@/services/errors';
import type { Appointment } from '@/types/appointment';
import { isStatusKey } from '@/types/appointment';

/** DTO renvoyé par l'API pour un rendez-vous. Séparé du modèle (A7). */
export interface AppointmentDto {
  id: string;
  patient_id: string;
  dentist_id: string;
  service_id: string;
  /** Instants ISO 8601. */
  start_at: string;
  end_at: string;
  status: string;
  motif?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mappe un rendez-vous renvoyé par l'API.
 *
 * Le statut est validé : la table des transitions (A8.5) est indexée par statut,
 * et un statut inconnu venu d'une version plus récente de l'API produirait un
 * écran blanc. Mieux vaut une erreur affichée par `ErrorState` qu'un `undefined`
 * qui circule.
 */
export function mapAppointmentDto(dto: AppointmentDto): Appointment {
  if (!isStatusKey(dto.status)) {
    throw new DomainError('UNKNOWN', 'Le statut d’un rendez-vous est inconnu.');
  }

  return {
    id: dto.id,
    patientId: dto.patient_id,
    dentistId: dto.dentist_id,
    serviceId: dto.service_id,
    startAt: dto.start_at,
    endAt: dto.end_at,
    status: dto.status,
    motif: dto.motif ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

/** Corps de création envoyé à l'API pour une demande de rendez-vous (A8.6). */
export interface AppointmentRequestDto {
  patient_id: string;
  dentist_id: string;
  service_id: string;
  /** Début du rendez-vous, ISO 8601. La durée est calculée par l'API. */
  start_at: string;
  motif?: string;
  /** `'patient'` fixe le statut de départ à `en_attente`. */
  created_by: 'patient';
}
