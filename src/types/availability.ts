/**
 * Disponibilités hebdomadaires déclarées par un dentiste (B0, A8.2).
 *
 * Une plage est exprimée en minutes depuis minuit : `540` = 09:00. Ce format
 * évite les fuseaux dans les calculs de créneaux, qui restent en heure locale
 * du cabinet (Africa/Dakar).
 */

/** Index de la semaine : 0 = lundi … 6 = dimanche, comme `Date#getDay()` - 1. */
export const WEEKDAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Les sept index, dans l'ordre, prêts à parcourir par un `.map`.
 *
 * Évite d'écrire `[0, 1, 2, 3, 4, 5, 6]` puis de transtyper chaque valeur en
 * `WeekdayIndex` : `WEEKDAY_INDEXES.map(...)` est déjà correctement typé.
 */
export const WEEKDAY_INDEXES: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

/** Un jour ouvert : plage de travail et pauses. */
export interface WorkingDay {
  weekday: WeekdayIndex;
  /** Début de la plage de travail, en minutes depuis minuit. */
  startMinutes: number;
  /** Fin de la plage de travail, en minutes depuis minuit. */
  endMinutes: number;
  /** Pauses (midi, rendez-vous personnel) exclues des créneaux proposés. */
  breaks: TimeRange[];
}

/** Intervalle semi-ouvert `[start, end[`, en minutes depuis minuit. */
export interface TimeRange {
  startMinutes: number;
  endMinutes: number;
}

/** Disponibilités complètes d'un dentiste, un jour ouvert par entrée. */
export type WeeklyAvailability = Record<WeekdayIndex, WorkingDay | null>;

/** Jour de la semaine d'une date, au format `WeekdayIndex` (0 = lundi). */
export function getWeekdayIndex(date: Date): WeekdayIndex {
  // `getDay()` : 0 = dimanche. On décale pour obtenir 0 = lundi.
  return ((date.getDay() + 6) % 7) as WeekdayIndex;
}

/**
 * Une journée est valide si la plage de travail est ordonnée et si chaque pause
 * est ordonnée **et** incluse dans la plage. Une pause inversée serait ignorée
 * par le calcul des créneaux, ce qui ouvrirait des heures que le dentiste
 * n'a pas declarées : elle est donc refusée à la saisie.
 */
export function isValidWorkingDay(day: WorkingDay): boolean {
  if (day.startMinutes >= day.endMinutes) return false;

  return day.breaks.every(
    (breakRange) =>
      breakRange.startMinutes < breakRange.endMinutes &&
      breakRange.startMinutes >= day.startMinutes &&
      breakRange.endMinutes <= day.endMinutes,
  );
}

/** Crée un objet `WeeklyAvailability` entièrement fermé. */
export function emptyAvailability(): WeeklyAvailability {
  return { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
}
