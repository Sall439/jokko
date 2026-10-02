import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import type { Slot } from '@/utils/slots';
import { minutesToLabel } from '@/utils/time';

/**
 * Grille des créneaux d'une journée.
 *
 * Les créneaux indisponibles restent visibles mais barrés : cacher les heures
 * prises donnerait l'impression d'une erreur de calcul, alors que le cabinet
 * travaille bien ce jour-là. Pure : props entrantes, `onSelect` sortant.
 */

type Props = {
  slots: Slot[];
  /** Début retenu, en minutes depuis minuit. */
  selectedStartMinutes: number | null;
  onSelect: (startMinutes: number) => void;
};

export function SlotGrid({ slots, selectedStartMinutes, onSelect }: Props) {
  if (slots.length === 0) return null;

  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const selected = slot.startMinutes === selectedStartMinutes;

        return (
          <Pressable
            key={slot.startMinutes}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: slot.disabled }}
            accessibilityLabel={`${minutesToLabel(slot.startMinutes)}${slot.disabled ? ', indisponible' : ''}`}
            disabled={slot.disabled}
            onPress={() => onSelect(slot.startMinutes)}
            style={({ pressed }) => [
              styles.slot,
              slot.availability === 'occupied' && styles.occupied,
              slot.availability === 'past' && styles.past,
              slot.availability === 'closed' && styles.closed,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, styles.labelDisabled, selected && styles.labelSelected]}>
              {minutesToLabel(slot.startMinutes)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  slot: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: Brand.hitTarget,
    marginBottom: Brand.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Brand.radius.sm,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    backgroundColor: Brand.colors.surface,
  },
  selected: { backgroundColor: Brand.colors.primary, borderColor: Brand.colors.primary },
  pressed: { opacity: 0.85 },

  /** Pris par un autre rendez-vous : visible, mais pas cliquable. */
  occupied: { backgroundColor: Brand.colors.background, borderColor: Brand.colors.border },
  /** Heure déjà passée aujourd'hui. */
  past: { backgroundColor: Brand.colors.background, borderColor: Brand.colors.border },
  /** Pause ou fin de journée. */
  closed: { backgroundColor: Brand.colors.background, borderColor: Brand.colors.border },

  label: { ...Typography.smStrong, color: Brand.colors.primaryDark },
  labelDisabled: { color: Brand.colors.textMuted, textDecorationLine: 'line-through' },
  labelSelected: { color: Brand.colors.onPrimary, textDecorationLine: 'none' },
});
