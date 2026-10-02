import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { appointmentsService } from '@/services/appointments';
import { catalogService } from '@/services/catalog';
import { dentistsService } from '@/services/dentists';
import { useAuth } from '@/features/auth/useAuth';
import type { Appointment } from '@/types/appointment';
import type { Dentist } from '@/types/dentist';
import type { Service } from '@/types/service';
import {
  countByFilter,
  countUpcoming,
  filterAppointments,
  sortAppointments,
  type AppointmentFilterId,
} from '@/utils/appointments';
import { resolveAppointments } from '@/utils/appointment-references';

/**
 * « Mes rendez-vous » côté patient (A5).
 *
 * Le rechargement est déclenché à chaque affichage de l'onglet : un rendez-vous
 * demandé puis annulé doit être à jour quand le patient y revient, même si la
 * session est restée ouverte.
 */

interface State {
  appointments: Appointment[];
  services: Service[];
  dentists: Dentist[];
  /** Instant des classements, figé au chargement pour ne pas bouger à chaque rendu. */
  now: Date;
  error: string | null;
}

const EMPTY: State = {
  appointments: [],
  services: [],
  dentists: [],
  now: new Date(),
  error: null,
};

export function usePatientAppointments() {
  const { user } = useAuth();
  const patientId = user?.id ?? null;

  const [state, setState] = useState<State>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AppointmentFilterId>('tous');

  const requestKey = `${patientId ?? ''}|${reloadKey}`;

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    (async () => {
      try {
        const [appointments, services, dentists] = await Promise.all([
          appointmentsService.listForPatient(patientId),
          catalogService.list(),
          dentistsService.list(),
        ]);
        if (cancelled) return;

        setState({ appointments, services, dentists, now: new Date(), error: null });
        setLoadedKey(requestKey);
        setRefreshing(false);
      } catch (error) {
        if (cancelled) return;

        setState({
          ...EMPTY,
          now: new Date(),
          error: error instanceof Error ? error.message : null,
        });
        setLoadedKey(requestKey);
        setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `requestKey` résume exactement le patient et le compteur de rechargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // Rafraîchit au retour sur l'onglet. La première apparition est ignorée :
  // l'effet de chargement ci-dessus vient déjà de partir, on ne veut pas
  // déclencher une seconde requête identique au premier rendu.
  const alreadyFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (alreadyFocused.current) setReloadKey((key) => key + 1);
      alreadyFocused.current = true;
    }, []),
  );

  const loading = patientId === null || loadedKey !== requestKey;

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  const resolved = useMemo(
    () =>
      resolveAppointments(state.appointments, {
        services: state.services,
        dentists: state.dentists,
        patients: user ? [user] : [],
      }),
    [state.appointments, state.dentists, state.services, user],
  );

  const sorted = useMemo(() => sortAppointments(resolved, state.now), [resolved, state.now]);

  const visible = useMemo(
    () => filterAppointments(sorted, filter, state.now),
    [filter, sorted, state.now],
  );

  const counts = useMemo(
    () => countByFilter(state.appointments, state.now),
    [state.appointments, state.now],
  );

  const upcomingCount = useMemo(
    () => countUpcoming(state.appointments, state.now),
    [state.appointments, state.now],
  );

  return {
    appointments: visible,
    allAppointments: sorted,
    counts,
    upcomingCount,
    filter,
    setFilter,
    loading,
    refreshing,
    error: state.error,
    refresh,
  };
}
