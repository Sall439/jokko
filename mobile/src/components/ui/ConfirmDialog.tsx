import { Alert } from 'react-native';

/**
 * Confirmation avant une action irréversible (Phase 6).
 *
 * Empiler les `Alert` dans les écrans les rendrait impossibles à relire et
 * impossibles à tester : la formulation et la logique de boutons sont donc
 * réunies ici. Pure côté appelant : props entrantes, `onConfirm` sortant.
 */

type Props = {
  title: string;
  message: string;
  /** Libellé de l'action confirmée. */
  confirmLabel: string;
  /** Libellé de l'action annulée. */
  cancelLabel?: string;
  /** `true` pour une confirmation destructive. */
  destructive?: boolean;
  onConfirm: () => void;
};

export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  destructive = false,
  onConfirm,
}: Props) {
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
