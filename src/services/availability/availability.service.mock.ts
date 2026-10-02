import { SEED_AVAILABILITY } from '@/mocks/availability';
import { DomainError, wait } from '@/services/errors';
import {
  emptyAvailability,
  type WeeklyAvailability,
  type WeekdayIndex,
  type WorkingDay,
} from '@/types/availability';
import { isValidWorkingDay } from '@/types/availability';

/** Contrat du domaine « disponibilités » : mock aujourd'hui, API en Phase 7. */
export interface IAvailabilityService {
  /** Disponibilités hebdomadaires déclarées d'un dentiste. */
  getWeekly(dentistId: string): Promise<WeeklyAvailability>;
  /**
   * Remplace les disponibilités d'un dentiste. Un jour invalide (début ≥ fin,
   * pause hors plage) est refusé : le patient ne doit pas pouvoir réserver dans
   * une plage incohérente (A8.2).
   */
  setWeekly(dentistId: string, availability: WeeklyAvailability): Promise<WeeklyAvailability>;
}

/** Stockage en mémoire, comme la session : les mocks ne survivent pas au redémarrage. */
const store = new Map<string, WeeklyAvailability>(Object.entries(SEED_AVAILABILITY));

export const mockAvailabilityService: IAvailabilityService = {
  async getWeekly(dentistId) {
    await wait();
    return store.get(dentistId) ?? emptyAvailability();
  },

  async setWeekly(dentistId, availability) {
    await wait();

    for (const day of Object.values(availability)) {
      if (day && !isValidWorkingDay(day)) {
        throw new DomainError(
          'OUTSIDE_AVAILABILITY',
          "Une plage horaire est invalide : l'heure de début doit précéder l'heure de fin, et la pause doit rester dans la plage.",
        );
      }
    }

    store.set(dentistId, availability);
    return availability;
  },
};

/** Jours ouverts d'une semaine, pour proposer les dates réservables. */
export function openWeekdays(availability: WeeklyAvailability): WeekdayIndex[] {
  return (Object.keys(availability) as unknown as WeekdayIndex[]).filter(
    (weekday) => availability[weekday] !== null,
  );
}

export type { WorkingDay, WeeklyAvailability };
