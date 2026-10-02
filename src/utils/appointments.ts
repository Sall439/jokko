import type { Appointment } from '@/types/appointment';

/**
 * Règles de gestion du rendez-vous (A8.1, A8.4), en fonctions pures.
 *
 * Ces fonctions ne lisent ni l'heure courante ni un service : elles reçoivent
 * `now` pour rester testables, et les services mock les appellent.
 */

/** Intervalle semi-ouvert `[start, end[`, en millisecondes. */
export interface IntervalMs {
  startMs: number;
  endMs: number;
}

/**
 * Deux rendez-vous se chevauchent-ils ?
 *
 * La comparaison est semi-ouverte : un rendez-vous qui finit à 10:00 et un
 * autre qui commence à 10:00 ne se chevauchent pas (A8.1).
 */
export function overlapsInterval(a: IntervalMs, b: IntervalMs): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/** Le rendez-vous chevauche-t-il l'un de ceux de `others` ? */
export function hasOverlap(candidate: IntervalMs, others: IntervalMs[]): boolean {
  return others.some((other) => overlapsInterval(candidate, other));
}

/** Statuts qui occupent encore une place dans l'agenda d'un dentiste. */
const BLOCKING_STATUSES: ReadonlySet<Appointment['status']> = new Set(['en_attente', 'confirme']);

/** Le rendez-vous occupe-t-il encore une place ? */
export function blocksAgenda(appointment: Pick<Appointment, 'status'>): boolean {
  return BLOCKING_STATUSES.has(appointment.status);
}

/**
 * Le patient peut-il annuler ce rendez-vous ?
 *
 * Règle A8.4 : annulation possible jusqu'à 24 h avant le début. On compare au
 * **début** du rendez-vous, pas à sa fin.
 */
export function canPatientCancel(
  appointment: Pick<Appointment, 'startAt' | 'status'>,
  now: Date = new Date(),
): boolean {
  if (appointment.status === 'annule' || appointment.status === 'termine') return false;

  const startMs = new Date(appointment.startAt).getTime();
  const diffMs = startMs - now.getTime();

  return diffMs > CANCELLATION_WINDOW_MS;
}

/** Fenêtre d'annulation : 24 heures (B0). */
export const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Message affiché quand l'annulation est refusée pour cause de délai. */
export const CANCELLATION_TOO_LATE_MESSAGE =
  "L'annulation en ligne n'est possible que jusqu'à 24 heures avant le rendez-vous.";

/** Heures restantes avant le rendez-vous, arrondies à l'unité supérieure. */
export function hoursUntilAppointment(startAt: string, now: Date = new Date()): number {
  const diffMs = new Date(startAt).getTime() - now.getTime();
  return Math.ceil(diffMs / (60 * 60 * 1000));
}

/* -------------------------------------------------------------------------- */
/* Listes et filtres — « Mes rendez-vous » (écran patient)                    */
/* -------------------------------------------------------------------------- */

export type AppointmentFilterId = 'tous' | 'en_attente' | 'confirme' | 'historique';

/** Filtres dans l'ordre d'affichage, avec leur libellé français (A3). */
export const APPOINTMENT_FILTERS: { id: AppointmentFilterId; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'en_attente', label: 'En attente' },
  { id: 'confirme', label: 'Confirmés' },
  { id: 'historique', label: 'Historique' },
];

/**
 * Le rendez-vous est-il encore à venir ?
 *
 * Seuls « en attente » et « confirmé » comptent : un rendez-vous terminé ou
 * annulé appartient à l'historique, même si sa date est future (annulation
 * anticipée faite par le cabinet).
 */
export function isUpcoming(
  appointment: Pick<Appointment, 'startAt' | 'status'>,
  now: Date = new Date(),
): boolean {
  return (
    new Date(appointment.startAt).getTime() > now.getTime() &&
    (appointment.status === 'en_attente' || appointment.status === 'confirme')
  );
}

/**
 * Classe les rendez-vous pour la lecture : ce qui arrive d'abord en premier,
 * puis ce qui est passé, du plus récent au plus ancien.
 *
 * Sans ce tri, un rendez-vous annulé dans trois mois passerait avant le
 * rendez-vous de demain.
 */
export function sortAppointments<T extends Appointment>(
  appointments: T[],
  now: Date = new Date(),
): T[] {
  const nowMs = now.getTime();

  return [...appointments].sort((a, b) => {
    const aStart = new Date(a.startAt).getTime();
    const bStart = new Date(b.startAt).getTime();
    const aFuture = aStart > nowMs;
    const bFuture = bStart > nowMs;

    if (aFuture !== bFuture) return aFuture ? -1 : 1;

    return aFuture ? aStart - bStart : bStart - aStart;
  });
}

/** Applique un filtre de la liste « Mes rendez-vous ». */
export function filterAppointments<T extends Appointment>(
  appointments: T[],
  filter: AppointmentFilterId,
  now: Date = new Date(),
): T[] {
  switch (filter) {
    case 'en_attente':
      return appointments.filter((appointment) => appointment.status === 'en_attente');
    case 'confirme':
      return appointments.filter((appointment) => appointment.status === 'confirme');
    case 'historique':
      return appointments.filter((appointment) => !isUpcoming(appointment, now));
    case 'tous':
    default:
      return appointments;
  }
}

/** Nombre de rendez-vous par filtre, pour les pastilles des puces. */
export function countByFilter(
  appointments: Appointment[],
  now: Date = new Date(),
): Record<AppointmentFilterId, number> {
  return {
    tous: appointments.length,
    en_attente: appointments.filter((a) => a.status === 'en_attente').length,
    confirme: appointments.filter((a) => a.status === 'confirme').length,
    historique: appointments.filter((a) => !isUpcoming(a, now)).length,
  };
}

/** Nombre de rendez-vous encore à venir : le compteur de « Mon compte ». */
export function countUpcoming(appointments: Appointment[], now: Date = new Date()): number {
  return appointments.filter((appointment) => isUpcoming(appointment, now)).length;
}

/**
 * Nombre de consultations déjà faites : les rendez-vous « terminés ».
 *
 * Un rendez-vous annulé n'en est pas une, même s'il a eu lieu un jour : le
 * patient ne veut pas voir « 2 consultations » alors qu'il en a fait une seule.
 */
export function countCompleted(appointments: Appointment[]): number {
  return appointments.filter((appointment) => appointment.status === 'termine').length;
}

/** Compteurs de l'onglet « Mon compte » (Phase 5). */
export interface PatientActivity {
  /** Rendez-vous programmés : en attente et confirmés, à venir. */
  upcoming: number;
  /** Consultations passées et terminées. */
  completed: number;
}

export function summarizePatientActivity(
  appointments: Appointment[],
  now: Date = new Date(),
): PatientActivity {
  return { upcoming: countUpcoming(appointments, now), completed: countCompleted(appointments) };
}
