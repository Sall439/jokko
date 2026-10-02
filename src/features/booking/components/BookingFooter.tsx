import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Brand } from '@/constants/brand';
import type { BookingStep } from '@/features/booking/useBookingFlow';

type Props = {
  step: BookingStep;
  /** Un choix est-il valide ? Un créneau libre a-t-il été retenu ? */
  canContinue: boolean;
  submitting: boolean;
  onBack: () => void;
  onContinue: () => void;
  onConfirm: () => void;
};

/**
 * Barre d'action du parcours, fixée en bas de l'écran.
 *
 * « Retour » est secondaire : il partage la ligne avec l'action principale
 * plutôt que d'être repoussé hors de l'écran par une longue liste de soins.
 * L'action principale reste désactivée tant qu'un choix n'est pas complet, et
 * le libellé change à la dernière étape pour dire ce qui va se passer.
 *
 * Pure : props entrantes, trois événements sortants.
 */
export function BookingFooter({
  step,
  canContinue,
  submitting,
  onBack,
  onContinue,
  onConfirm,
}: Props) {
  const confirming = step === 'confirm';
  const canGoBack = step !== 'dentist';

  return (
    <View style={styles.row}>
      {canGoBack ? (
        <View style={styles.slot}>
          <Button label="Retour" variant="outline" icon="arrow-left" onPress={onBack} />
        </View>
      ) : null}

      <View style={[styles.slot, canGoBack ? styles.slotPrimary : null]}>
        <Button
          label={confirming ? 'Envoyer la demande' : 'Continuer'}
          icon={confirming ? 'check' : 'arrow-right'}
          onPress={confirming ? onConfirm : onContinue}
          disabled={!canContinue}
          loading={submitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Brand.spacing.sm },
  slot: { flex: 1 },
  slotPrimary: { flex: 2 },
});
