import { confirmAction } from '@/components/ui/ConfirmDialog';
import { formatRelativeDay, formatTime } from '@/utils/date';

import type { PendingRequest } from './usePendingRequests';

/**
 * Confirmation avant de refuser une demande de rendez-vous (Phase 6).
 *
 * Le refus est définitif (A8.5) et le patient le voit comme un rendez-vous
 * annulé : une frappe involontaire ne doit pas pouvoir annuler la demande
 * d'un patient. La formulation est ici, avec le reste de la logique de l'espace
 * praticien, et non dans l'écran.
 */
export function confirmRefusal(request: PendingRequest, onRefuse: () => void): void {
  confirmAction({
    title: 'Refuser cette demande ?',
    message:
      `La demande de ${request.patientName} pour le ${formatRelativeDay(request.startAt).toLowerCase()} ` +
      `à ${formatTime(request.startAt)} sera annulée. Le patient la verra comme annulée dans « Mes RDV ».`,
    confirmLabel: 'Refuser la demande',
    cancelLabel: 'Garder la demande',
    destructive: true,
    onConfirm: onRefuse,
  });
}
