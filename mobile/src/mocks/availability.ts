import type { WeeklyAvailability, WeekdayIndex, WorkingDay } from '@/types/availability';

/**
 * Disponibilités hebdomadaires du Dr Ndiaye (B0) :
 * lundi, mardi, jeudi 09:00–17:00 (pause 13:00–14:00) ;
 * mercredi 09:00–13:00 ; vendredi 09:00–16:00 (pause 13:00–14:00) ;
 * samedi et dimanche fermés.
 *
 * Le Dr Fall n'a pas de disponibilités déclarées dans le cahier des charges :
 * son agenda reste donc vide tant que le cabinet ne les communique pas.
 * Les RDV de seed le concernent (B0), mais aucune plage ne peut être ouverte :
 * c'est une hypothèse signalée, pas une invention de disponibilités.
 */

const LUNCH_BREAK = { startMinutes: 13 * 60, endMinutes: 14 * 60 };

function working(
  weekday: WeekdayIndex,
  startHour: number,
  endHour: number,
  breaks: WorkingDay['breaks'] = [],
): WorkingDay {
  return {
    weekday,
    startMinutes: startHour * 60,
    endMinutes: endHour * 60,
    breaks,
  };
}

export const SEED_AVAILABILITY_NDIAYE: WeeklyAvailability = {
  0: working(0, 9, 17, [LUNCH_BREAK]), // lundi
  1: working(1, 9, 17, [LUNCH_BREAK]), // mardi
  2: working(2, 9, 13), // mercredi, sans pause : la plage s'arrête à 13:00
  3: working(3, 9, 17, [LUNCH_BREAK]), // jeudi
  4: working(4, 9, 16, [LUNCH_BREAK]), // vendredi
  5: null, // samedi fermé
  6: null, // dimanche fermé
};

/** Aucun jour déclaré pour le Dr Fall dans le cahier des charges. */
export const SEED_AVAILABILITY_FALL: WeeklyAvailability = {
  0: null,
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
};

export const SEED_AVAILABILITY: Record<string, WeeklyAvailability> = {
  'dentist-ndiaye': SEED_AVAILABILITY_NDIAYE,
  'dentist-fall': SEED_AVAILABILITY_FALL,
};

/** Jours ouverts, pour lister les dates réservables. */
export function isOpenOn(availability: WeeklyAvailability, weekday: WeekdayIndex): boolean {
  return availability[weekday] !== null;
}
