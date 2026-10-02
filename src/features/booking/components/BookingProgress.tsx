import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import { BOOKING_STEPS, getStepLabel } from '@/features/booking/useBookingFlow';

type Props = {
  /** Index de l'étape courante, de 0 à `BOOKING_STEPS.length - 1`. */
  stepIndex: number;
};

type DotState = 'done' | 'current' | 'todo';

/**
 * Barre de progression du parcours de réservation (A3) : quatre étapes nommées,
 * la courante mise en avant, les précédentes cochées.
 * Pure : pas d'événement.
 */
export function BookingProgress({ stepIndex }: Props) {
  return (
    <View style={styles.track}>
      {BOOKING_STEPS.map((step, index) => (
        <StepDot
          key={step}
          number={index + 1}
          label={getStepLabel(step)}
          state={index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'todo'}
        />
      ))}
    </View>
  );
}

function StepDot({ number, label, state }: { number: number; label: string; state: DotState }) {
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.dot,
          state === 'current' && styles.dotCurrent,
          state === 'done' && styles.dotDone,
        ]}
      >
        {state === 'done' ? (
          <Feather name="check" size={13} color={Brand.colors.onPrimary} />
        ) : (
          <Text style={[styles.number, state === 'current' && styles.numberCurrent]}>{number}</Text>
        )}
      </View>
      <Text style={[styles.label, state === 'todo' && styles.labelTodo]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', justifyContent: 'space-between' },

  step: { alignItems: 'center', gap: Brand.spacing.xs, flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    backgroundColor: Brand.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: { backgroundColor: Brand.colors.primary, borderColor: Brand.colors.primary },
  dotDone: { backgroundColor: Brand.colors.primaryDark, borderColor: Brand.colors.primaryDark },

  number: { ...Typography.xs, color: Brand.colors.textMuted },
  numberCurrent: { color: Brand.colors.onPrimary },

  label: { ...Typography.xs, color: Brand.colors.primaryDark },
  labelTodo: { color: Brand.colors.textMuted },
});
