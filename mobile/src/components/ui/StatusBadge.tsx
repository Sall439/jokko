import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, STATUS_COLORS, STATUS_LABELS, Typography, type StatusKey } from '@/constants/brand';
import type { FeatherIconName } from '@/types/ui';

type Props = {
  status: StatusKey;
  /** Taille réduite pour les listes denses (grille de créneaux, compteurs). */
  size?: 'sm' | 'md';
};

const STATUS_ICONS: Record<StatusKey, FeatherIconName> = {
  en_attente: 'clock',
  confirme: 'check-circle',
  annule: 'x-circle',
  termine: 'check',
};

/**
 * Badge de statut d'un rendez-vous (A4) : En attente (orange), Confirmé (vert),
 * Annulé (rouge), Terminé (gris `textMuted`). Pure : props entrantes, pas d'événement.
 */
export function StatusBadge({ status, size = 'md' }: Props) {
  const color = STATUS_COLORS[status];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Statut : ${STATUS_LABELS[status]}`}
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: `${color}1A` },
      ]}
    >
      <Feather name={STATUS_ICONS[status]} size={size === 'sm' ? 11 : 13} color={color} />
      <Text style={[styles.label, { color }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Brand.radius.pill,
  },
  badgeMd: { gap: Brand.spacing.xs, paddingHorizontal: Brand.spacing.md, paddingVertical: 5 },
  badgeSm: { gap: 3, paddingHorizontal: Brand.spacing.sm, paddingVertical: 3 },
  label: { ...Typography.xs, fontFamily: Brand.fonts.bodySemiBold },
});
