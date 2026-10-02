import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Brand, Typography } from '@/constants/brand';

/**
 * Compteurs de l'onglet « Mon compte » : consultations passées et rendez-vous
 * programmés (Phase 5).
 *
 * Pure : les chiffres sont reçus en props. La règle qui les produit vit dans
 * `summarizePatientActivity` — ce composant ne fait que les présenter.
 */

type Props = {
  /** Rendez-vous en attente ou confirmés, à venir. */
  upcoming: number;
  /** Consultations terminées. */
  completed: number;
};

export function ActivitySummary({ upcoming, completed }: Props) {
  return (
    <Card>
      <View style={styles.row}>
        <Counter
          icon="calendar"
          value={upcoming}
          label={upcoming > 1 ? 'rendez-vous programmés' : 'rendez-vous programmé'}
          color={Brand.colors.primary}
        />
        <View style={styles.divider} />
        <Counter
          icon="check-circle"
          value={completed}
          label={completed > 1 ? 'consultations effectuées' : 'consultation effectuée'}
          color={Brand.colors.success}
        />
      </View>
    </Card>
  );
}

function Counter({
  icon,
  value,
  label,
  color,
}: {
  icon: 'calendar' | 'check-circle';
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${value} ${label}`}
      style={styles.cell}
    >
      <View style={[styles.iconCircle, { backgroundColor: Brand.colors.background }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flex: 1, alignItems: 'center', gap: Brand.spacing.xs, paddingVertical: Brand.spacing.sm },
  divider: { width: 1, backgroundColor: Brand.colors.border, marginVertical: Brand.spacing.sm },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { ...Typography.h2, color: Brand.colors.primaryDark },
  label: { ...Typography.xs, color: Brand.colors.textMuted, textAlign: 'center' },
});
