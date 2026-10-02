/** Conversions entre minutes depuis minuit et heures lisibles. */

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * 60;

/** 540 → « 09:00 ». Ne dépend pas d'`Intl` : le format est fixe (A3). */
export function minutesToLabel(minutes: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, Math.trunc(minutes)));
  const hours = Math.floor(clamped / MINUTES_PER_HOUR);
  const rest = clamped % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/** « 09:00 » → 540. Renvoie `null` si le format est invalide. */
export function labelToMinutes(label: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 23) return null;

  return hours * MINUTES_PER_HOUR + minutes;
}

/** Minutes écoulées depuis minuit pour une date. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
}
