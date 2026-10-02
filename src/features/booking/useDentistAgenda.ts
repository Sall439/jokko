import { useCallback, useEffect, useMemo, useState } from 'react';

import { appointmentsService } from '@/services/appointments';
import { availabilityService } from '@/services/availability';
import type { Appointment } from '@/types/appointment';
import type { WeeklyAvailability } from '@/types/availability';
import { BOOKABLE_DAYS_COUNT, listOpenDays } from '@/utils/booking';
import { availableSlots, computeSlots, type Slot } from '@/utils/slots';

/**
 * Agenda d'un dentiste pour un soin donné : les dates proposables et les
 * créneaux du jour demandé.
 *
 * Le calcul reste dans `computeSlots` (A8.7). Ce hook se contente de charger
 * les disponibilités et l'agenda, puis de fournir les deux listes déjà
 * filtrées à l'écran.
 */

interface AgendaState {
  availability: WeeklyAvailability | null;
  appointments: Appointment[];
  /** Instant de référence des calculs, figé au chargement pour rester stable. */
  now: Date | null;
  error: string | null;
}

const EMPTY: AgendaState = { availability: null, appointments: [], now: null, error: null };

/** Horizon de recherche : assez large pour trouver `BOOKABLE_DAYS_COUNT` jours libres. */
const SEARCH_DAYS = BOOKABLE_DAYS_COUNT * 4;

type Params = {
  dentistId: string | null;
  serviceId: string | null;
  /** Durée du soin, en minutes. */
  durationMinutes: number | null;
};

export function useDentistAgenda({ dentistId, serviceId, durationMinutes }: Params) {
  const [state, setState] = useState<AgendaState>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * Clé du chargement en cours. `loading` en découle par comparaison plutôt
   * qu'être posé dans l'effet : le retour d'une requête ne réécrit jamais
   * l'état de chargement depuis le corps de l'effet.
   */
  const requestKey = `${dentistId ?? ''}|${serviceId ?? ''}|${durationMinutes ?? ''}|${reloadKey}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const ready = dentistId !== null && serviceId !== null && durationMinutes !== null;

  useEffect(() => {
    if (!dentistId || !serviceId || !durationMinutes) return;

    let cancelled = false;

    (async () => {
      try {
        const [availability, appointments] = await Promise.all([
          availabilityService.getWeekly(dentistId),
          appointmentsService.listForDentist(dentistId),
        ]);
        if (cancelled) return;

        setState({ availability, appointments, now: new Date(), error: null });
        setLoadedKey(requestKey);
      } catch (error) {
        if (cancelled) return;
        setState({ ...EMPTY, error: error instanceof Error ? error.message : null });
        setLoadedKey(requestKey);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `requestKey` summarise exactement les trois entrées ci-dessus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loading = !ready || loadedKey !== requestKey;

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const slotsFor = useCallback(
    (date: Date): Slot[] => {
      if (!state.availability || !state.now) return [];

      return computeSlots({
        dentistId: dentistId ?? '',
        availability: state.availability,
        appointments: state.appointments,
        serviceDuration: durationMinutes ?? 0,
        date,
        now: state.now,
      });
    },
    [dentistId, durationMinutes, state.availability, state.appointments, state.now],
  );

  /**
   * Dates réellement réservables : jours ouverts **et** possédant au moins un
   * créneau libre. Proposer un jour dont la grille est entièrement barrée
   * ferait perdre un écran au patient sans raison.
   */
  const bookableDays = useMemo(() => {
    if (!state.availability || !state.now || !dentistId || !durationMinutes) return [];

    return listOpenDays(state.availability, SEARCH_DAYS, state.now)
      .filter(
        (day) =>
          availableSlots({
            dentistId,
            availability: state.availability as WeeklyAvailability,
            appointments: state.appointments,
            serviceDuration: durationMinutes,
            date: day,
            now: state.now as Date,
          }).length > 0,
      )
      .slice(0, BOOKABLE_DAYS_COUNT);
  }, [state.availability, state.appointments, state.now, dentistId, durationMinutes]);

  return { ...state, loading, bookableDays, slotsFor, reload };
}
