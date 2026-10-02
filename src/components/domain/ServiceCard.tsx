import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Brand, Typography } from '@/constants/brand';
import type { Service } from '@/types/service';
import { SERVICE_CATEGORY_LABELS } from '@/types/service';
import { formatFcfa } from '@/utils/currency';

type Props = {
  service: Service;
  /** Met en évidence le soin choisi (parcours de réservation). */
  selected?: boolean;
  onSelect?: (id: string) => void;
  /** Libellé de l'action : « Choisir » dans le parcours, « Réserver » dans l'onglet Soins. */
  actionLabel?: string;
};

/**
 * Carte de soin (A4) : nom, catégorie, durée, tarif en FCFA.
 * Pure : props entrantes, `onSelect` sortant.
 */
export function ServiceCard({
  service,
  selected = false,
  onSelect,
  actionLabel = 'Choisir',
}: Props) {
  return (
    <Card selected={selected} onPress={onSelect ? () => onSelect(service.id) : undefined}>
      <View style={styles.header}>
        <Text style={styles.name}>{service.name}</Text>
        {service.popular ? (
          <View style={styles.popular}>
            <Feather name="star" size={11} color={Brand.colors.warning} />
            <Text style={styles.popularText}>Populaire</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.category}>{SERVICE_CATEGORY_LABELS[service.category]}</Text>
      <Text style={styles.description}>{service.description}</Text>

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Feather name="clock" size={14} color={Brand.colors.textMuted} />
          <Text style={styles.metaText}>{service.durationMinutes} min</Text>
        </View>

        <Text style={styles.price}>{formatFcfa(service.priceFcfa)}</Text>
      </View>

      {onSelect ? (
        <View style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Feather name="chevron-right" size={16} color={Brand.colors.primary} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Brand.spacing.sm },
  name: { ...Typography.bodyStrong, color: Brand.colors.primaryDark, flex: 1 },
  popular: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Brand.colors.overlays.warningSoft,
    borderRadius: Brand.radius.pill,
    paddingHorizontal: Brand.spacing.sm,
    paddingVertical: 2,
  },
  popularText: { ...Typography.xs, color: Brand.colors.text },

  category: { ...Typography.xs, color: Brand.colors.primary, marginTop: 2 },
  description: { ...Typography.sm, color: Brand.colors.textMuted, marginTop: Brand.spacing.xs },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Brand.spacing.md,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.xs },
  metaText: { ...Typography.sm, color: Brand.colors.textMuted },
  price: { ...Typography.bodyStrong, color: Brand.colors.primaryDark },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Brand.spacing.xs,
    marginTop: Brand.spacing.md,
    paddingTop: Brand.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Brand.colors.border,
  },
  actionText: { ...Typography.smStrong, color: Brand.colors.primary },
});
