import { useCallback, useState } from 'react';

import { appointmentsService } from '@/services/appointments';
import { DomainError } from '@/services/errors';
import type { AppointmentAction } from '@/types/appointment';

/**
 * Actions du praticien sur un rendez-vous (A8.5).
 *
 * Les transitions autorisées sont imposées par le service, pas par l'écran :
 * l'interface n'affiche que les actions possibles, mais c'est
 * `canTransition` qui refuse une transition interdite. Le message du refus est
 * renvoyé tel quel, sans être réécrit ici.
 */

type State = { actingId: string | null; action: AppointmentAction | null; error: string | null };

const IDLE: State = { actingId: null, action: null, error: null };

/** Libellés d'action, dans l'ordre d'affichage. */
export const ACTION_LABELS: Record<AppointmentAction, string> = {
  confirm: 'Confirmer',
  complete: 'Marquer terminé',
  cancel: 'Annuler',
};

export function useAppointmentActions(onDone?: () => void) {
  const [state, setState] = useState<State>(IDLE);

  const run = useCallback(
    async (id: string, action: AppointmentAction) => {
      setState({ actingId: id, action, error: null });

      try {
        if (action === 'confirm') await appointmentsService.confirm(id);
        else if (action === 'complete') await appointmentsService.complete(id);
        else await appointmentsService.cancelByDentist(id);

        setState(IDLE);
        onDone?.();
      } catch (error) {
        setState({
          actingId: null,
          action: null,
          error:
            error instanceof DomainError ? error.message : "L'action n'a pas abouti. Réessayez.",
        });
      }
    },
    [onDone],
  );

  /**
   * Quelle action est en cours sur ce rendez-vous, `null` si aucune.
   *
   * Sert à n'afficher le spinner que sur le bouton réellement pressé : trois
   * lignes d'agenda ne doivent pas clignoter ensemble pendant une validation.
   */
  const busyFor = useCallback(
    (id: string): AppointmentAction | null => (state.actingId === id ? state.action : null),
    [state.actingId, state.action],
  );

  const clearError = useCallback(() => setState(IDLE), []);

  return { act: run, busyFor, error: state.error, clearError };
}
