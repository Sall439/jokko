import { useCallback, useEffect, useMemo, useState } from 'react';

import { availabilityService } from '@/services/availability';
import { DomainError } from '@/services/errors';
import {
  addBreak,
  removeBreak,
  setBreak,
  setDayHours,
  toggleDay,
  validateAvailability,
} from '@/utils/availability-draft';
import type { WeeklyAvailability, WeekdayIndex } from '@/types/availability';

/**
 * Éditeur de disponibilités hebdomadaires (écran praticien).
 *
 * L'écran modifie un **brouillon** ; rien n'est enregistré tant que le
 * praticien n'appuie pas sur « Enregistrer ». C'est important : une plage
 * déclarée détermine les créneaux proposés aux patients (A8.2), une erreur
 * d'appui ne doit donc pas être immédiatement visible enreservation.
 *
 * Les opérations sont pures (`utils/availability-draft`) ; ce hook ne fait que
 * porter l'état et appeler le service.
 */

type SaveState = { saving: boolean; saved: boolean; error: string | null };

const IDLE: SaveState = { saving: false, saved: false, error: null };

export function useAvailabilityEditor(dentistId: string | null) {
  const [savedAvailability, setSavedAvailability] = useState<WeeklyAvailability | null>(null);
  const [draft, setDraft] = useState<WeeklyAvailability | null>(null);
  const [saveState, setSaveState] = useState<SaveState>(IDLE);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requestKey = `${dentistId ?? ''}|${reloadKey}`;

  useEffect(() => {
    if (!dentistId) return;

    let cancelled = false;

    (async () => {
      try {
        const availability = await availabilityService.getWeekly(dentistId);
        if (cancelled) return;

        setSavedAvailability(availability);
        setDraft(availability);
        setLoadedKey(requestKey);
      } catch (error) {
        if (cancelled) return;
        setSaveState({
          saving: false,
          saved: false,
          error: error instanceof DomainError ? error.message : 'Chargement impossible.',
        });
        setLoadedKey(requestKey);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loading = dentistId === null || loadedKey !== requestKey;

  /** Applique une modification au brouillon. */
  const edit = useCallback((mutate: (current: WeeklyAvailability) => WeeklyAvailability) => {
    setSaveState((previous) => ({ ...previous, saved: false }));
    setDraft((current) => (current ? mutate(current) : current));
  }, []);

  const onToggleDay = useCallback(
    (weekday: WeekdayIndex) => edit((current) => toggleDay(current, weekday)),
    [edit],
  );

  const onSetHours = useCallback(
    (weekday: WeekdayIndex, startMinutes: number, endMinutes: number) =>
      edit((current) => setDayHours(current, weekday, startMinutes, endMinutes)),
    [edit],
  );

  const onAddBreak = useCallback(
    (weekday: WeekdayIndex) => edit((current) => addBreak(current, weekday)),
    [edit],
  );

  const onRemoveBreak = useCallback(
    (weekday: WeekdayIndex, index: number) =>
      edit((current) => removeBreak(current, weekday, index)),
    [edit],
  );

  const onSetBreak = useCallback(
    (weekday: WeekdayIndex, index: number, startMinutes: number, endMinutes: number) =>
      edit((current) => setBreak(current, weekday, index, startMinutes, endMinutes)),
    [edit],
  );

  const onDiscard = useCallback(() => {
    setDraft(savedAvailability);
    setSaveState(IDLE);
  }, [savedAvailability]);

  const problems = useMemo(() => (draft ? validateAvailability(draft) : []), [draft]);

  /** Y a-t-il des modifications non enregistrées ? */
  const dirty = useMemo(
    () => draft !== null && JSON.stringify(draft) !== JSON.stringify(savedAvailability),
    [draft, savedAvailability],
  );

  const canSave = draft !== null && dirty && problems.length === 0 && !saveState.saving;

  const save = useCallback(async () => {
    if (!dentistId || !draft) return;

    setSaveState({ saving: true, saved: false, error: null });

    try {
      const saved = await availabilityService.setWeekly(dentistId, draft);
      setSavedAvailability(saved);
      setDraft(saved);
      setSaveState({ saving: false, saved: true, error: null });
    } catch (error) {
      setSaveState({
        saving: false,
        saved: false,
        error:
          error instanceof DomainError
            ? error.message
            : "Les disponibilités n'ont pas pu être enregistrées. Réessayez.",
      });
    }
  }, [dentistId, draft]);

  return {
    draft,
    savedAvailability,
    loading,
    saving: saveState.saving,
    saved: saveState.saved,
    error: saveState.error,
    problems,
    dirty,
    canSave,
    save,
    onToggleDay,
    onSetHours,
    onAddBreak,
    onRemoveBreak,
    onSetBreak,
    onDiscard,
    reload: () => setReloadKey((key) => key + 1),
  };
}
