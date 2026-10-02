import type { WeeklyAvailability } from '@/types/availability';
import { getWeekdayIndex } from '@/types/availability';
import type { Appointment } from '@/types/appointment';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '@/utils/time';

/**
 * Calcul des créneaux proposés au patient (A8.7).
 *
 * Fonction **pure** : mêmes entrées, mêmes sorties, aucun accès réseau, aucun
 * état global. `computeSlots` est le seul endroit qui décide quels créneaux
 * existent ; les services l'appellent, ils ne le réimplémentent pas.
 *
 * Règles appliquées :
 * - A8.1 : deux rendez-vous d'un même dentiste ne se chevauchent pas
 *           (comparaison d'intervalles semi-ouverts `[début, fin[`).
 * - A8.2 : un créneau n'est proposé que dans une disponibilité déclarée,
 *           hors pause, et dans le futur.
 * - A8.3/A8.4 : un créneau n'est retenu que s'il tient entièrement dans la
 *           plage de travail ; un soin qui déborderait sur une pause est écarté
 *           plutôt que proposé puis refusé à la confirmation.
 * - Les débuts de créneaux sont alignés sur un pas fixe (30 min par défaut, B0).
 */

export type SlotAvailability = 'libre' | 'occupied' | 'past' | 'closed';

export interface Slot {
  /** Début du créneau, en minutes depuis minuit. */
  startMinutes: number;
  /** Fin du créneau = début + durée du soin (A8.3). */
  endMinutes: number;
  availability: SlotAvailability;
  /**
   * `true` si le créneau est indisponible. L'écran barre le créneau au lieu de
   * le masquer : le patient voit que la journée existe, mais qu'il reste des
   * heures possibles.
   */
  disabled: boolean;
}

export interface ComputeSlotsInput {
  /** Dentiste dont on calcule l'agenda. Ses rendez-vous seuls l'occupent. */
  dentistId: string;
  /** Disponibilités hebdomadaires déclarées par ce dentiste. */
  availability: WeeklyAvailability;
  /**
   * Pauses ponctuelles (congé, urgence) en plus des pauses hebdomadaires :
   * `{ startAt, endAt }` au format ISO 8601.
   */
  breaks?: { startAt: string; endAt: string }[];
  /**
   * Rendez-vous du dentiste. Seuls les statuts `en_attente` et `confirme`
   * occupent une place : un rendez-vous `annule` ou `termine` libère son créneau.
   */
  appointments?: Appointment[];
  /** Durée du soin choisi, en minutes. Détermine la fin du créneau. */
  serviceDuration: number;
  /** Jour visé, à minuit local. */
  date: Date;
  /** Instant de référence pour écarter le passé. Injecté pour rester testable. */
  now?: Date;
  /** Pas entre deux débuts de créneaux, en minutes. 30 par défaut (B0). */
  slotStepMinutes?: number;
}

export const DEFAULT_SLOT_STEP_MINUTES = 30;

/** Durée de repli quand le catalogue ne fournit aucune durée. */
export const DEFAULT_DURATION_MINUTES = 30;

/** Statuts qui occupent encore une place dans l'agenda. */
const BLOCKING_STATUSES: ReadonlySet<Appointment['status']> = new Set(['en_attente', 'confirme']);

interface Interval {
  startMinutes: number;
  endMinutes: number;
}

/**
 * Chevauchement d'intervalles semi-ouverts : `[09:00, 09:30[` et
 * `[09:30, 10:00[` ne se chevauchent pas (règle A8.1).
 */
function overlaps(a: Interval, b: Interval): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

/** Minutes depuis minuit pour un instant ISO. */
function minutesOf(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Rendez-vous actifs du dentiste sur le jour visé, en intervalles de minutes. */
function busyIntervals(
  input: Required<Pick<ComputeSlotsInput, 'dentistId' | 'appointments'>>,
  date: Date,
): Interval[] {
  return input.appointments
    .filter((appointment) => appointment.dentistId === input.dentistId)
    .filter((appointment) => BLOCKING_STATUSES.has(appointment.status))
    .filter((appointment) => isSameDay(new Date(appointment.startAt), date))
    .map((appointment) => ({
      startMinutes: minutesOf(appointment.startAt),
      endMinutes: minutesOf(appointment.endAt),
    }));
}

/**
 * Liste complète des créneaux du jour, avec leur état.
 *
 * Un jour fermé renvoie une liste vide : rien à afficher, et le patient comprend
 * que le cabinet ne travaille pas ce jour-là.
 */
export function computeSlots(input: ComputeSlotsInput): Slot[] {
  const {
    availability,
    serviceDuration,
    date,
    now = new Date(),
    slotStepMinutes = DEFAULT_SLOT_STEP_MINUTES,
    breaks = [],
  } = input;

  if (serviceDuration <= 0 || slotStepMinutes <= 0) return [];

  const workingDay = availability[getWeekdayIndex(date)];
  if (!workingDay) return [];

  const day = startOfDay(date);
  const busy = busyIntervals(
    { dentistId: input.dentistId, appointments: input.appointments ?? [] },
    day,
  );
  const extraBreaks: Interval[] = breaks.map((b) => ({
    startMinutes: minutesOf(b.startAt),
    endMinutes: minutesOf(b.endAt),
  }));

  const nowMinutes = now.getHours() * MINUTES_PER_HOUR + now.getMinutes();
  const isToday = isSameDay(now, day);

  const slots: Slot[] = [];

  for (
    let startMinutes = workingDay.startMinutes;
    startMinutes + serviceDuration <= workingDay.endMinutes;
    startMinutes += slotStepMinutes
  ) {
    const candidate: Interval = { startMinutes, endMinutes: startMinutes + serviceDuration };

    // A8.2 : le créneau doit tenir dans la plage déclarée.
    const outsideWorkingHours =
      candidate.startMinutes < workingDay.startMinutes ||
      candidate.endMinutes > workingDay.endMinutes;

    // A8.2 : jamais sur une pause, hebdo ou ponctuelle.
    const onBreak =
      workingDay.breaks.some((b) => overlaps(candidate, b)) ||
      extraBreaks.some((b) => overlaps(candidate, b));

    // A8.1 : jamais sur un rendez-vous actif.
    const taken = busy.some((interval) => overlaps(candidate, interval));

    // A8.2 : jamais dans le passé.
    const inPast = isToday && startMinutes < nowMinutes;

    const state: SlotAvailability = outsideWorkingHours
      ? 'closed'
      : taken
        ? 'occupied'
        : onBreak
          ? 'closed'
          : inPast
            ? 'past'
            : 'libre';

    slots.push({
      startMinutes,
      endMinutes: candidate.endMinutes,
      availability: state,
      disabled: state !== 'libre',
    });
  }

  return slots;
}

/** Créneaux réellement proposables (A8.2). */
export function availableSlots(input: ComputeSlotsInput): Slot[] {
  return computeSlots(input).filter((slot) => !slot.disabled);
}

/** Un créneau précis est-il encore proposable ? */
export function isSlotAvailable(input: ComputeSlotsInput, startMinutes: number): boolean {
  return availableSlots(input).some((slot) => slot.startMinutes === startMinutes);
}

/** Bornes du jour, pour l'en-tête « de 09:00 à 17:00 ». */
export function getDayBounds(date: Date, availability: WeeklyAvailability): Interval | null {
  const workingDay = availability[getWeekdayIndex(date)];
  if (!workingDay) return null;
  return {
    startMinutes: workingDay.startMinutes,
    endMinutes: Math.min(workingDay.endMinutes, MINUTES_PER_DAY),
  };
}
