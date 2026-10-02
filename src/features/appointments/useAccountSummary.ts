import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { appointmentsService } from '@/services/appointments';
import { useAuth } from '@/features/auth/useAuth';
import type { Appointment } from '@/types/appointment';
import { summarizePatientActivity, type PatientActivity } from '@/utils/appointments';

/**
 * Compteurs de l'onglet « Mon compte » (Phase 5).
 *
 * Deux chiffres seulement : les rendez-vous programmés et les consultations
 * passées. Ils sont calculés par `summarizePatientActivity` à partir des
 * rendez-vous du patient — l'application ne demande donc pas une donnée
 * supplémentaire à l'API, et les deux compteurs ne peuvent pas diverger de
 * « Mes RDV ».
 *
 * Le rechargement est déclenché au retour sur l'onglet : un rendez-vous demandé
 * puis annulé doit avoir changer les compteurs quand le patient y revient.
 */

const EMPTY: PatientActivity = { upcoming: 0, completed: 0 };

export function useAccountSummary() {
  const { user } = useAuth();
  const patientId = user?.id ?? null;

  const [activity, setActivity] = useState<PatientActivity>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestKey = `${patientId ?? ''}|${reloadKey}`;

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    (async () => {
      try {
        const appointments: Appointment[] = await appointmentsService.listForPatient(patientId);
        if (cancelled) return;

        setActivity(summarizePatientActivity(appointments, new Date()));
        setError(null);
        setLoadedKey(requestKey);
        setRefreshing(false);
      } catch (thrown) {
        if (cancelled) return;

        // Les compteurs restent à zéro : un chiffre faux serait pire qu'un
        // écran d'erreur, qui propose « Réessayer ».
        setActivity(EMPTY);
        setError(thrown instanceof Error ? thrown.message : null);
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

  // La première apparition est ignorée : l'effet de chargement vient déjà de
  // partir, on ne déclencherait sinon une seconde requête identique.
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

  return useMemo(
    () => ({
      upcoming: activity.upcoming,
      completed: activity.completed,
      loading,
      refreshing,
      error,
      refresh,
    }),
    [activity.completed, activity.upcoming, loading, refreshing, error, refresh],
  );
}
