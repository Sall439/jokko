import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { appointmentsService } from '@/services/appointments';
import { availabilityService } from '@/services/availability';
import { catalogService } from '@/services/catalog';
import { patientsService } from '@/services/patients';
import { usePractitioner } from '@/features/dentist/usePractitioner';
import type { Appointment } from '@/types/appointment';
import type { WeeklyAvailability } from '@/types/availability';
import type { Patient } from '@/types/patient';
import type { Service } from '@/types/service';

/**
 * Données communes à l'espace praticien : son agenda, ses disponibilités, le
 * catalogue des soins et l'annuaire des patients.
 *
 * Les écrans Agenda et En attente ont besoin du même quartet ; le charger une
 * seule fois évite deux requêtes identiques par changement d'onglet. Le
 * rechargement est déclenché au retour sur l'onglet, pour qu'une décision prise
 * dans « En attente » apparaisse aussitôt dans l'agenda.
 */

interface State {
  appointments: Appointment[];
  services: Service[];
  patients: Patient[];
  availability: WeeklyAvailability;
  /** Instant de référence, figé au chargement pour stabiliser les calculs. */
  now: Date;
  error: string | null;
}

const EMPTY: State = {
  appointments: [],
  services: [],
  patients: [],
  availability: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
  now: new Date(),
  error: null,
};

export function useDentistSchedule() {
  const practitioner = usePractitioner();
  const dentistId = practitioner.dentistId;

  const [state, setState] = useState<State>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const requestKey = `${dentistId ?? ''}|${reloadKey}`;

  useEffect(() => {
    if (!dentistId) return;

    let cancelled = false;

    (async () => {
      try {
        const [appointments, services, patients, availability] = await Promise.all([
          appointmentsService.listForDentist(dentistId),
          catalogService.list(),
          patientsService.list(),
          availabilityService.getWeekly(dentistId),
        ]);
        if (cancelled) return;

        setState({ appointments, services, patients, availability, now: new Date(), error: null });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // La première apparition est ignorée : l'effet ci-dessus vient de partir, on
  // ne relance pas une requête identique au premier rendu.
  const alreadyFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (alreadyFocused.current) setReloadKey((key) => key + 1);
      alreadyFocused.current = true;
    }, []),
  );

  const loading = dentistId === null || loadedKey !== requestKey;

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  return {
    dentistId,
    unlinked: practitioner.unlinked,
    appointments: state.appointments,
    services: state.services,
    patients: state.patients,
    availability: state.availability,
    now: state.now,
    loading,
    refreshing,
    error: practitioner.error ?? state.error,
    refresh,
    reload: practitioner.reload,
  };
}
