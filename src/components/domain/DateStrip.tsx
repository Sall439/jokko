import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import { toDateKey } from '@/utils/booking';

/**
 * Sélecteur de date : bandeau horizontal de jours réservables.
 *
 * Chaque jour est présenté en trois lignes (jour de la semaine, numéro, mois)
 * pour tenir dans une pastille carrée. Pure : props entrantes, `onSelect`
 * sortant — aucun accès aux créneaux, cette information appartient à l'écran.
 */

type Props = {
  /** Les jours proposables, déjà filtrés par le hook de réservation. */
  days: Date[];
  /** Clé du jour sélectionné (`YYYY-MM-DD`). */
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

export function DateStrip({ days, selectedKey, onSelect }: Props) {
  if (days.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}
    >
      {days.map((day) => {
        const key = toDateKey(day);
        const selected = key === selectedKey;

        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${WEEKDAYS[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]}`}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [
              styles.day,
              selected && styles.daySelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.weekday, selected && styles.labelSelected]}>
              {WEEKDAYS[day.getDay()]}
            </Text>
            <Text style={[styles.number, selected && styles.labelSelected]}>{day.getDate()}</Text>
            <Text style={[styles.month, selected && styles.labelSelected]}>
              {MONTHS[day.getMonth()]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { gap: Brand.spacing.sm, paddingVertical: Brand.spacing.xs },

  day: {
    width: 60,
    paddingVertical: Brand.spacing.md,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    backgroundColor: Brand.colors.surface,
    alignItems: 'center',
    gap: 2,
  },
  daySelected: { backgroundColor: Brand.colors.primary, borderColor: Brand.colors.primary },
  pressed: { opacity: 0.85 },

  weekday: { ...Typography.xs, color: Brand.colors.textMuted },
  number: { ...Typography.h3, color: Brand.colors.primaryDark },
  month: { ...Typography.xs, color: Brand.colors.textMuted },
  labelSelected: { color: Brand.colors.onPrimary },
});
