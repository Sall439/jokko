import type { Appointment, AppointmentAction, AppointmentStatus } from '@/types/appointment';
import { STATUS_TRANSITIONS } from '@/types/appointment';
import type { Patient } from '@/types/patient';
import { getPatientDisplayName } from '@/types/patient';
import { addDays, toDateKey } from '@/utils/booking';

/**
 * Vue du praticien sur ses rendez-vous (espace dentiste).
 *
 * Résolution des libellés, compteurs d'une journée, navigation entre les jours
 * et actions autorisées. L'annuaire des patients vit dans `utils/patients`.
 */

/** Rendez-vous, avec les libellés résolus pour l'affichage. */
export interface ResolvedForPractitioner extends Appointment {
  serviceName: string;
  patientName: string;
  patientPhone: string;
}

export const UNKNOWN_SERVICE_NAME = 'Soin non précisé';
export const UNKNOWN_PATIENT_NAME = 'Patient non précisé';

/** Résout les libellés d'un rendez-vous vu par le praticien. */
export function resolveForPractitioner(
  appointment: Appointment,
  patients: Patient[],
  services: { id: string; name: string }[],
): ResolvedForPractitioner {
  const patient = patients.find((item) => item.id === appointment.patientId);

  return {
    ...appointment,
    serviceName:
      services.find((item) => item.id === appointment.serviceId)?.name ?? UNKNOWN_SERVICE_NAME,
    patientName: patient ? getPatientDisplayName(patient) : UNKNOWN_PATIENT_NAME,
    patientPhone: patient?.phone ?? '',
  };
}

export function resolveForPractitionerList(
  appointments: Appointment[],
  patients: Patient[],
  services: { id: string; name: string }[],
): ResolvedForPractitioner[] {
  return appointments.map((appointment) => resolveForPractitioner(appointment, patients, services));
}

/** Compteurs d'une journée d'agenda (B0). */
export interface DayStats {
  total: number;
  en_attente: number;
  confirme: number;
  termine: number;
  annule: number;
  /** Rendez-vous réellement occupeurs de l'agenda (ni annulés, ni refusés). */
  blocking: number;
}

export function computeDayStats(appointments: Appointment[]): DayStats {
  const stats: DayStats = {
    total: appointments.length,
    en_attente: 0,
    confirme: 0,
    termine: 0,
    annule: 0,
    blocking: 0,
  };

  for (const appointment of appointments) {
    stats[appointment.status] += 1;
    if (appointment.status === 'en_attente' || appointment.status === 'confirme') {
      stats.blocking += 1;
    }
  }

  return stats;
}

/**
 * Les demandes en attente du praticien, de la plus ancienne à la plus récente.
 *
 * Trié par date de création : une demande reçue il y a trois jours passe
 * avant celle reçue ce matin, quel que soit l'horaire du rendez-vous demandé.
 */
export function sortPendingRequests(
  appointments: ResolvedForPractitioner[],
): ResolvedForPractitioner[] {
  return [...appointments]
    .filter((appointment) => appointment.status === 'en_attente')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Fenêtre de navigation dans l'agenda, en jours. */
export const AGENDA_HORIZON_DAYS = 14;

/** Rendez-vous d'un même jour, en comparant les dates **locales** du cabinet. */
export function appointmentsOnDay(appointments: Appointment[], date: Date): Appointment[] {
  const key = toDateKey(date);

  return appointments
    .filter((appointment) => toDateKey(new Date(appointment.startAt)) === key)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

/** Clés des jours ayant au moins un rendez-vous, dans les `horizon` prochains jours. */
export function listAgendaDays(
  appointments: Appointment[],
  now: Date = new Date(),
  horizon: number = AGENDA_HORIZON_DAYS,
): string[] {
  const keys: string[] = [];

  for (let offset = 0; offset < horizon; offset += 1) {
    const day = addDays(now, offset);
    if (appointmentsOnDay(appointments, day).length > 0) keys.push(toDateKey(day));
  }

  return keys;
}

/**
 * Jour d'ouverture de l'agenda.
 *
 * Aujourd'hui s'il y a quelque chose à montrer, sinon le premier jour à venir
 * qui a un rendez-vous : arriver sur un agenda vide alors que des
 * consultations sont prévues demain serait trompeur.
 */
export function pickAgendaDay(appointments: Appointment[], now: Date = new Date()): string {
  const today = toDateKey(now);
  const [first] = listAgendaDays(appointments, now);

  return first ?? today;
}

/**
 * Jours proposés dans le bandeau de l'agenda.
 *
 * Les jours ayant au moins un rendez-vous, plus aujourd'hui : sans lui, un
 * praticien sans consultation le jour même n'aurait aucun jour du tout à
 * afficher, et ne pourrait pas consulter « sa journée » vide.
 *
 * Les rendez-vous passés sont exclus de l'horizon : le bandeau sert à préparer
 * les journées à venir, l'historique se lit sur « Patients ».
 */
export function agendaDayKeys(
  appointments: Appointment[],
  now: Date = new Date(),
  horizon: number = AGENDA_HORIZON_DAYS,
): string[] {
  const filled = new Set(listAgendaDays(appointments, now, horizon));
  filled.add(toDateKey(now));

  return [...filled].sort();
}

/**
 * Actions du praticien possibles depuis un statut (A8.5).
 *
 * Traduit `STATUS_TRANSITIONS` en noms d'action, pour que l'écran n'ait pas à
 * comparer des statuts : un rendez-vous « terminé » ne se voit aucun bouton.
 */
export function availableActions(status: AppointmentStatus): AppointmentAction[] {
  const allowed = STATUS_TRANSITIONS[status];

  return (['confirm', 'complete', 'cancel'] as const).filter((action) =>
    allowed.includes(ACTION_TARGET[action]),
  );
}

/** Statut vers lequel chaque action mène. */
const ACTION_TARGET: Record<AppointmentAction, AppointmentStatus> = {
  confirm: 'confirme',
  complete: 'termine',
  cancel: 'annule',
};
