import type { StatusKey } from '@/constants/brand';

/** Statuts métier d'un rendez-vous (A8.5). */
export type AppointmentStatus = StatusKey;

/** Rôle ayant réservé. `dentist` sert aux rendez-vous créés par le cabinet. */
export type AppointmentOwner = 'patient' | 'dentist';

/**
 * Action du praticien sur un rendez-vous (A8.5).
 *
 * Nommée ici, dans le domaine, et non dans un composant : l'utilitaire qui
 * décide quelles actions proposer a besoin de la connaître, et un `utils/` ne
 * doit pas dépendre d'un `features/`.
 */
export type AppointmentAction = 'confirm' | 'complete' | 'cancel';

export interface Appointment {
  id: string;
  /** Identifiant du patient, quel que soit l'espace d'où l'on regarde. */
  patientId: string;
  dentistId: string;
  serviceId: string;
  /** Instant de début (ISO 8601). */
  startAt: string;
  /** Instant de fin, calculé à partir de la durée du soin (A8.3). */
  endAt: string;
  status: AppointmentStatus;
  /** Motif facultatif saisi par le patient. */
  motif?: string;
  createdAt: string;
  updatedAt: string;
}

/** Résumé d'un rendez-vous, avec les libellés résolus pour l'affichage. */
export interface AppointmentWithDetails extends Appointment {
  serviceName: string;
  dentistName: string;
  patientName: string;
}

/** Transitions autorisées (A8.5) : `termine` et `annule` sont finaux. */
export const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  en_attente: ['confirme', 'annule'],
  confirme: ['termine', 'annule'],
  annule: [],
  termine: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Le statut est-il l'un des quatre de la charte (A8.5) ?
 *
 * Les données de l'API sont lues à lexecution : un statut inconnu ne doit pas
 * produire une table de transitions `undefined` en aval, qui planterait au
 * premier affichage. Le mapper l'utilise pour refuser la réponse plutôt que de
 * laisser une valeurrangée en circulation.
 */
export function isStatusKey(value: string): value is AppointmentStatus {
  return Object.hasOwn(STATUS_TRANSITIONS, value);
}

/** Un rendez-vous passé dans le temps et non clôturé est considéré terminé. */
export function isPast(appointment: Appointment, now: Date = new Date()): boolean {
  return new Date(appointment.endAt).getTime() < now.getTime();
}
