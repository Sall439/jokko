import { useCallback, useEffect, useMemo, useState } from 'react';

import { patientsService } from '@/services/patients';
import { filterPatients } from '@/utils/patients';
import type { PatientSummary } from '@/types/patient';

/**
 * Patients suivis par le praticien (écran « Patients »).
 *
 * Le service ne renvoie que les patients ayant un rendez-vous avec ce
 * praticien (A8.6) : aucune recherche globale dans l'annuaire du cabinet, ce
 * qui n'aurait pas de sens depuis un téléphone.
 *
 * La recherche est locale et instantanée : la liste d'un praticien tient dans
 * quelques dizaines d'entrées, il serait absurde d'aller interroger l'API à
 * chaque frappe.
 */

interface State {
  patients: PatientSummary[];
  error: string | null;
}

const EMPTY: State = { patients: [], error: null };

export function useTrackedPatients(dentistId: string | null) {
  const [state, setState] = useState<State>(EMPTY);
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const requestKey = `${dentistId ?? ''}|${reloadKey}`;

  useEffect(() => {
    if (!dentistId) return;

    let cancelled = false;

    (async () => {
      try {
        const patients = await patientsService.listForDentist(dentistId);
        if (cancelled) return;

        setState({ patients, error: null });
        setLoadedKey(requestKey);
        setRefreshing(false);
      } catch (error) {
        if (cancelled) return;

        setState({ patients: [], error: error instanceof Error ? error.message : null });
        setLoadedKey(requestKey);
        setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loading = dentistId === null || loadedKey !== requestKey;

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  const visible = useMemo(() => filterPatients(state.patients, query), [query, state.patients]);

  return {
    patients: visible,
    totalCount: state.patients.length,
    query,
    setQuery,
    loading,
    refreshing,
    error: state.error,
    refresh,
    hasQuery: query.trim() !== '',
  };
}
