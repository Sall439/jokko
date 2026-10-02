import type { WeeklyAvailability } from '@/types/availability';
import { getWeekdayIndex } from '@/types/availability';

/**
 * Utilitaires de réservation (A8) : sélection de la date.
 *
 * Une date n'est proposable que si le dentiste travaille ce jour-là. Le tri
 * final — « ce jour reste-t-il un créneau libre ? » — est fait par le hook de
 * réservation qui connaît l'agenda ; ici on ne s'occupe que de la semaine
 * déclarée.
 */

/** Nombre de dates affichées dans le sélecteur. */
export const BOOKABLE_DAYS_COUNT = 14;

/** Horizon balayé pour trouver `count` jours ouvrés (le week-end fait partie du filtre). */
const SEARCH_HORIZON_DAYS = 60;

/**
 * Clé de date stable pour l'état de sélection et les clés de liste React.
 *
 * Construite sur les composants **locaux** : `toISOString()` travaillerait en
 * UTC et décalerait la date d'un jour selon la machine de développement.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Inverse de `toDateKey`. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);

  return new Date(year, month - 1, day);
}

/** Ajoute `days` à une date, sans heures ni minutes. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Jours réservables déclarés par le dentiste, à partir de `now`.
 *
 * Renvoie au plus `count` jours. Le jour même est conservé s'il est ouvert :
 * c'est `computeSlots` qui décidera ensuite s'il reste des heures libres, et il
 * est plus honnête de montrer un jour partiellement rempli que de le cacher.
 */
export function listOpenDays(
  availability: WeeklyAvailability,
  count: number = BOOKABLE_DAYS_COUNT,
  now: Date = new Date(),
): Date[] {
  if (count <= 0) return [];

  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days: Date[] = [];

  for (let offset = 0; offset < SEARCH_HORIZON_DAYS && days.length < count; offset += 1) {
    const day = addDays(first, offset);
    if (availability[getWeekdayIndex(day)] !== null) days.push(day);
  }

  return days;
}

/**
 * Décale la sélection sur le premier jour encore réservable.
 *
 * Utilisé quand le jour choisi n'a plus aucun créneau : sans cela l'écran
 * afficherait une grille vide sans explication.
 */
export function firstOpenDay(
  availability: WeeklyAvailability,
  now: Date = new Date(),
): Date | null {
  return listOpenDays(availability, 1, now)[0] ?? null;
}
