import { useCallback, useState } from 'react';

import { appointmentsService } from '@/services/appointments';
import { DomainError } from '@/services/errors';
import { CANCELLATION_TOO_LATE_MESSAGE, canPatientCancel } from '@/utils/appointments';
import type { Appointment } from '@/types/appointment';

/**
 * Annulation d'un rendez-vous par le patient (A8.4).
 *
 * La règle des 24 heures est évaluée ici pour **désactiver** le bouton avec une
 * explication, et une seconde fois dans le service pour **refuser** la demande.
 * Les deux fois le même code : `canPatientCancel`.
 */

type State = { cancellingId: string | null; error: string | null };

const IDLE: State = { cancellingId: null, error: null };

/** Pourquoi l'annulation est indisponible, à afficher sous le bouton. */
export function getCancellationBlockReason(
  appointment: Appointment,
  now: Date = new Date(),
): string | null {
  if (canPatientCancel(appointment, now)) return null;

  if (appointment.status === 'annule') return 'Ce rendez-vous est déjà annulé.';
  if (appointment.status === 'termine') return 'Ce rendez-vous a déjà eu lieu.';

  return CANCELLATION_TOO_LATE_MESSAGE;
}

export function useCancelAppointment(onDone?: () => void) {
  const [state, setState] = useState<State>(IDLE);

  const cancel = useCallback(
    async (id: string, now: Date = new Date()) => {
      setState({ cancellingId: id, error: null });

      try {
        await appointmentsService.cancelByPatient(id, now);
        setState(IDLE);
        onDone?.();
      } catch (error) {
        setState({
          cancellingId: null,
          error:
            error instanceof DomainError
              ? error.message
              : "L'annulation n'a pas abouti. Réessayez.",
        });
      }
    },
    [onDone],
  );

  const clearError = useCallback(() => setState(IDLE), []);

  return {
    cancel,
    cancellingId: state.cancellingId,
    error: state.error,
    clearError,
  };
}
