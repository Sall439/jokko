import { getDentistDisplayName } from '@/types/dentist';
import type { User } from '@/types/auth';
import type { Appointment } from '@/types/appointment';
import type { Dentist } from '@/types/dentist';
import type { Service } from '@/types/service';

/**
 * Résolution des libellés d'un rendez-vous (A5).
 *
 * Les services renvoient des identifiants ; l'écran a besoin de textes. Cette
 * résolution est **pure** et centralisée : aucun écran ne fera
 * `services.find(...)` à la main.
 *
 * `User` est accepté pour le patient, et `Dentist` pour le praticien : on ne
 * fait pas d'allocation mémoire pour un carré, seulement les champs affichés.
 */
export type PatientRef = Pick<User, 'id' | 'firstName' | 'lastName'>;

/** Listes de référence nécessaires à l'affichage. */
export interface AppointmentReferences {
  services: Service[];
  dentists: Dentist[];
  patients: PatientRef[];
}

/** Rendez-vous prêt à afficher : identifiants résolus en noms. */
export interface ResolvedAppointment extends Appointment {
  serviceName: string;
  dentistName: string;
  patientName: string;
  /** Soin introuvable dans le catalogue : l'écran doit le signaler, pas le cacher. */
  serviceMissing: boolean;
}

/** Libellés de repli quand une référence a disparu (catalogue modifié côté API). */
export const UNKNOWN_SERVICE_NAME = 'Soin non précisé';
export const UNKNOWN_DENTIST_NAME = 'Praticien non précisé';
export const UNKNOWN_PATIENT_NAME = 'Patient non précisé';

/**
 * Résout un rendez-vous. La fonction ne lève jamais : un identifiant inconnu
 * produit un libellé de repli et `serviceMissing`, pour que l'écran affiche
 * « Soin non précisé » au lieu de planter.
 */
export function resolveAppointment(
  appointment: Appointment,
  references: AppointmentReferences,
): ResolvedAppointment {
  const service = references.services.find((item) => item.id === appointment.serviceId);
  const dentist = references.dentists.find((item) => item.id === appointment.dentistId);
  const patient = references.patients.find((item) => item.id === appointment.patientId);

  return {
    ...appointment,
    serviceName: service?.name ?? UNKNOWN_SERVICE_NAME,
    dentistName: dentist ? getDentistDisplayName(dentist) : UNKNOWN_DENTIST_NAME,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : UNKNOWN_PATIENT_NAME,
    serviceMissing: !service,
  };
}

export function resolveAppointments(
  appointments: Appointment[],
  references: AppointmentReferences,
): ResolvedAppointment[] {
  return appointments.map((appointment) => resolveAppointment(appointment, references));
}
