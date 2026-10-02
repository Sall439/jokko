import { Brand } from '@/constants/brand';

/**
 * Utilitaires de date (A3) : fuseau Africa/Dakar, format français.
 *
 * Le projet ne dépend pas d'une librairie de dates : les besoins sont limités
 * (affichage d'un jour, d'une plage horaire, d'un mois) et le fuseau du
 * cabinet est fixe (UTC+0, sans changement d'heure). Utiliser `Intl` évite
 * d'ajouter une dépendance.
 */

const LOCALE = 'fr-FR';

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** « lundi 5 octobre 2026 ». */
export function formatLongDate(value: Date | string): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: Brand.rules.fuseau,
  });
}

/** « 5 octobre 2026 ». */
export function formatMediumDate(value: Date | string): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: Brand.rules.fuseau,
  });
}

/** « 23 sept. 2026 » — format court pour les listes denses. */
export function formatShortDate(value: Date | string): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: Brand.rules.fuseau,
  });
}

/** « 10:00 ». */
export function formatTime(value: Date | string): string {
  return toDate(value).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: Brand.rules.fuseau,
  });
}

/** « 10:00 – 10:30 ». */
export function formatTimeRange(start: Date | string, end: Date | string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** « Aujourd'hui » / « Demain » si l'on est à ce jour-là, sinon la date courte. */
export function formatRelativeDay(value: Date | string, now: Date = new Date()): string {
  const target = toDate(value);
  const startOfTarget = startOfDay(target).getTime();
  const startOfNow = startOfDay(now).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((startOfTarget - startOfNow) / dayMs);

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  return formatShortDate(target);
}

/** Jour à 00:00:00 local, base des comparaisons « même jour ». */
export function startOfDay(value: Date | string): Date {
  const date = toDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** `true` si les deux dates tombent le même jour au Dakar (UTC+0). */
export function isSameDay(a: Date | string, b: Date | string): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Nombre de jours entiers entre aujourd'hui et la date (négatif si passée). */
export function daysUntil(value: Date | string, now: Date = new Date()): number {
  const target = toDate(value);
  return Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000),
  );
}
