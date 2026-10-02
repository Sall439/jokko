import type { TimeRange, WeeklyAvailability, WeekdayIndex, WorkingDay } from '@/types/availability';
import { isValidWorkingDay, WEEKDAY_INDEXES } from '@/types/availability';

/**
 * Édition des disponibilités hebdomadaires (espace praticien).
 *
 * Fonctions pures et immuables : chaque modification renvoie une nouvelle
 * `WeeklyAvailability`. L'écran garde le brouillon en mémoire, le service
 * `setWeekly` le valide et l'enregistre.
 *
 * Le format reste « minutes depuis minuit » : `540` = 09:00.
 */

/** Amplitude d'une journée, en minutes depuis minuit. */
const FIRST_MINUTE = 6 * 60; // 06:00
const LAST_MINUTE = 22 * 60; // 22:00

/** Pas de saisie des horaires : 15 minutes, plus simple à renseigner au doigt. */
const TIME_STEP_MINUTES = 15;

/** Plage proposée à l'ouverture d'un jour : 09:00–17:00, pause 13:00–14:00. */
const DEFAULT_START = 9 * 60;
const DEFAULT_END = 17 * 60;
const DEFAULT_BREAK: TimeRange = { startMinutes: 13 * 60, endMinutes: 14 * 60 };

/** Arrondit une saisie au pas de 15 minutes, dans l'amplitude autorisée. */
function snapToStep(minutes: number): number {
  const snapped = Math.round(minutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  return Math.max(FIRST_MINUTE, Math.min(LAST_MINUTE, snapped));
}

function workingDay(weekday: WeekdayIndex, overrides: Partial<WorkingDay> = {}): WorkingDay {
  return {
    weekday,
    startMinutes: DEFAULT_START,
    endMinutes: DEFAULT_END,
    breaks: [DEFAULT_BREAK],
    ...overrides,
  };
}

/** Ouvre un jour fermé avec la plage proposée. */
function openDay(availability: WeeklyAvailability, weekday: WeekdayIndex): WeeklyAvailability {
  return { ...availability, [weekday]: workingDay(weekday) };
}

/** Ferme un jour ouvert, sans toucher aux autres. */
function closeDay(availability: WeeklyAvailability, weekday: WeekdayIndex): WeeklyAvailability {
  return { ...availability, [weekday]: null };
}

/** Alterne l'état ouvert / fermé d'un jour. */
export function toggleDay(
  availability: WeeklyAvailability,
  weekday: WeekdayIndex,
): WeeklyAvailability {
  return availability[weekday] === null
    ? openDay(availability, weekday)
    : closeDay(availability, weekday);
}

/** Remplace la plage de travail d'un jour. Les minutes sont arrondies au pas. */
export function setDayHours(
  availability: WeeklyAvailability,
  weekday: WeekdayIndex,
  startMinutes: number,
  endMinutes: number,
): WeeklyAvailability {
  const current = availability[weekday];
  if (!current) return availability;

  return {
    ...availability,
    [weekday]: {
      ...current,
      startMinutes: snapToStep(startMinutes),
      endMinutes: snapToStep(endMinutes),
    },
  };
}

/**
 * Ajoute une pause à un jour.
 *
 * La pause proposée est placée au milieu de la plage et décalée si elle
 * chevauche déjà une pause existante, pour ne pas produire immédiatement un
 * brouillon invalide.
 */
export function addBreak(
  availability: WeeklyAvailability,
  weekday: WeekdayIndex,
): WeeklyAvailability {
  const current = availability[weekday];
  if (!current) return availability;

  const length = DEFAULT_BREAK.endMinutes - DEFAULT_BREAK.startMinutes;
  const middle = snapToStep((current.startMinutes + current.endMinutes) / 2 - length / 2);

  const taken = current.breaks.some(
    (range) => middle < range.endMinutes && range.startMinutes < middle + length,
  );

  const candidate: TimeRange = taken
    ? { startMinutes: current.startMinutes, endMinutes: current.startMinutes + length }
    : { startMinutes: middle, endMinutes: middle + length };

  return {
    ...availability,
    [weekday]: { ...current, breaks: [...current.breaks, candidate] },
  };
}

/** Supprime la pause d'indice `index` sur un jour. */
export function removeBreak(
  availability: WeeklyAvailability,
  weekday: WeekdayIndex,
  index: number,
): WeeklyAvailability {
  const current = availability[weekday];
  if (!current || index < 0 || index >= current.breaks.length) return availability;

  return {
    ...availability,
    [weekday]: { ...current, breaks: current.breaks.filter((_, i) => i !== index) },
  };
}

/** Remplace une pause existante par de nouvelles bornes. */
export function setBreak(
  availability: WeeklyAvailability,
  weekday: WeekdayIndex,
  index: number,
  startMinutes: number,
  endMinutes: number,
): WeeklyAvailability {
  const current = availability[weekday];
  if (!current || index < 0 || index >= current.breaks.length) return availability;

  return {
    ...availability,
    [weekday]: {
      ...current,
      breaks: current.breaks.map((range, i) =>
        i === index
          ? { startMinutes: snapToStep(startMinutes), endMinutes: snapToStep(endMinutes) }
          : range,
      ),
    },
  };
}

/** Nombre de jours ouverts dans la semaine. */
function countOpenDays(availability: WeeklyAvailability): number {
  return WEEKDAY_INDEXES.filter((weekday) => availability[weekday] !== null).length;
}

/** Un point de vigilance, rattaché au jour concerné quand il y en a un. */
export interface AvailabilityProblem {
  /** Jour fautif, `null` pour un problème portant sur la semaine entière. */
  weekday: WeekdayIndex | null;
  message: string;
}

/**
 * Points de vigilance avant enregistrement, un par jour.
 *
 * Le service refusera de toute façon une plage incohérente (A8.2) ; ces
 * messages servent à l'expliquer *avant* l'enregistrement, pas après. Chaque
 * jour est rattaché à son index pour que l'écran puisse border le bloc fautif
 * plutôt que d'afficher une phrase à trous.
 */
export function validateAvailability(availability: WeeklyAvailability): AvailabilityProblem[] {
  const problems: AvailabilityProblem[] = [];

  for (const weekday of WEEKDAY_INDEXES) {
    const day = availability[weekday];

    if (day && !isValidWorkingDay(day)) {
      problems.push({
        weekday,
        message:
          "L'heure de début doit précéder l'heure de fin, et chaque pause rester dans la plage.",
      });
    }
  }

  if (countOpenDays(availability) === 0) {
    problems.push({
      weekday: null,
      message: 'Gardez au moins un jour ouvert, sinon aucun rendez-vous ne pourra être pris.',
    });
  }

  return problems;
}

/** Message de vigilance d'un jour donné, `null` si la journée est cohérente. */
export function problemForDay(
  problems: AvailabilityProblem[],
  weekday: WeekdayIndex,
): string | null {
  return problems.find((problem) => problem.weekday === weekday)?.message ?? null;
}

/** Résumé de la semaine, pour l'en-tête de l'écran. */
export function summarizeWeek(availability: WeeklyAvailability): string {
  const open = countOpenDays(availability);
  if (open === 0) return 'Aucun jour ouvert';

  return `${open} jour${open > 1 ? 's' : ''} ouvert${open > 1 ? 's' : ''} sur 7`;
}
