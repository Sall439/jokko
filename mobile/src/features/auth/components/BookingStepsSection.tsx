import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import type { FeatherIconName } from '@/types/ui';

type Step = { icon: FeatherIconName; label: string };

const STEPS: Step[] = [
  { icon: 'user', label: 'Choisissez votre dentiste' },
  { icon: 'activity', label: 'Choisissez votre soin' },
  { icon: 'clock', label: 'Sélectionnez un créneau libre' },
  { icon: 'check-circle', label: 'Confirmez votre demande' },
];

/**
 * Les 4 étapes de réservation (Phase 3). Numérotées et illustrées par des
 * icônes Feather de la charte.
 */
export function BookingStepsSection() {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>Réserver en quatre étapes</Text>
      {STEPS.map((step, index) => (
        <View key={step.label} style={styles.step}>
          <View style={styles.index}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
          <Feather name={step.icon} size={18} color={Brand.colors.primary} />
          <Text style={styles.label}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    padding: Brand.spacing.lg,
    gap: Brand.spacing.md,
  },
  title: { ...Typography.h3, color: Brand.colors.primaryDark },
  step: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.md },
  index: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Brand.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { ...Typography.smStrong, color: Brand.colors.primaryDark },
  label: { ...Typography.body, color: Brand.colors.text, flex: 1 },
});
