import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import type { DayStats } from '@/utils/practitioner';

/**
 * Compteurs d'une journée d'agenda (B0 : confirmés, en attente, terminés).
 * Pure : props entrantes, aucun événement.
 */

type Props = {
  stats: DayStats;
  freeSlotCount: number;
};

export function DayStatsBar({ stats, freeSlotCount }: Props) {
  return (
    <View style={styles.row}>
      <Stat
        icon="calendar"
        value={stats.total}
        label={stats.total > 1 ? 'consultations' : 'consultation'}
      />
      <Stat icon="clock" value={stats.en_attente} label="en attente" tone="warning" />
      <Stat icon="check-circle" value={stats.confirme} label="confirmés" tone="success" />
      <Stat icon="sun" value={stats.termine} label="terminés" />
      <Stat icon="plus-circle" value={freeSlotCount} label="créneaux libres" tone="primary" />
    </View>
  );
}

const TONE_COLORS = {
  default: Brand.colors.text,
  warning: Brand.colors.warning,
  success: Brand.colors.success,
  primary: Brand.colors.primary,
} as const;

function Stat({
  icon,
  value,
  label,
  tone = 'default',
}: {
  icon: 'calendar' | 'clock' | 'check-circle' | 'sun' | 'plus-circle';
  value: number;
  label: string;
  tone?: keyof typeof TONE_COLORS;
}) {
  return (
    <View style={styles.cell}>
      <Feather name={icon} size={14} color={TONE_COLORS[tone]} />
      <Text style={[styles.value, tone !== 'default' && { color: TONE_COLORS[tone] }]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    paddingVertical: Brand.spacing.md,
    paddingHorizontal: Brand.spacing.sm,
  },
  cell: {
    alignItems: 'center',
    flexGrow: 1,
    flexBasis: '30%',
    gap: 2,
    paddingVertical: Brand.spacing.sm,
  },
  value: { ...Typography.h3, color: Brand.colors.text },
  label: { ...Typography.xs, color: Brand.colors.textMuted, textAlign: 'center' },
});
