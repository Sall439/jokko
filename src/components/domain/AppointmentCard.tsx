import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Brand, Typography } from '@/constants/brand';
import type { ResolvedAppointment } from '@/utils/appointment-references';
import { formatRelativeDay, formatTimeRange, formatMediumDate } from '@/utils/date';

/**
 * Carte d'un rendez-vous côté patient (A4) : statut, soin, praticien, date et
 * horaire, motif saisi, annulation si le délai le permet.
 *
 * Pure : props entrantes, `onCancel` sortant.
 */

type Props = {
  appointment: ResolvedAppointment;
  /** `false` si le délai de 24 h est dépassé (A8.4). */
  cancellable: boolean;
  /** Explication affichée quand l'annulation est impossible. */
  blockReason?: string | null;
  cancelling?: boolean;
  onCancel?: (id: string) => void;
};

export function AppointmentCard({
  appointment,
  cancellable,
  blockReason,
  cancelling = false,
  onCancel,
}: Props) {
  const cancelled = appointment.status === 'annule';

  return (
    <Card>
      <View style={styles.header}>
        <StatusBadge status={appointment.status} />
        <Text style={styles.date}>{formatRelativeDay(appointment.startAt)}</Text>
      </View>

      <Text style={styles.service}>{appointment.serviceName}</Text>
      <Text style={styles.dentist}>{appointment.dentistName}</Text>

      <View style={styles.timeRow}>
        <Feather name="clock" size={14} color={Brand.colors.primary} />
        <Text style={styles.time}>{formatTimeRange(appointment.startAt, appointment.endAt)}</Text>
      </View>

      {appointment.motif ? (
        <View style={styles.motif}>
          <Text style={styles.motifLabel}>Votre motif</Text>
          <Text style={styles.motifText}>{appointment.motif}</Text>
        </View>
      ) : null}

      {cancelled ? (
        <Text style={styles.fullDate}>{formatMediumDate(appointment.startAt)}</Text>
      ) : null}

      {onCancel && !cancelled ? (
        <View style={styles.actions}>
          <Button
            label="Annuler le rendez-vous"
            variant="outline"
            icon="x"
            onPress={() => onCancel(appointment.id)}
            loading={cancelling}
            disabled={!cancellable}
          />
          {!cancellable && blockReason ? (
            <Text style={styles.blockReason}>{blockReason}</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Brand.spacing.sm,
  },
  date: { ...Typography.smStrong, color: Brand.colors.textMuted },

  service: {
    ...Typography.bodyStrong,
    color: Brand.colors.primaryDark,
    marginTop: Brand.spacing.md,
  },
  dentist: { ...Typography.sm, color: Brand.colors.textMuted },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.sm,
    marginTop: Brand.spacing.md,
  },
  time: { ...Typography.bodyMedium, color: Brand.colors.text },

  motif: {
    marginTop: Brand.spacing.md,
    backgroundColor: Brand.colors.background,
    borderRadius: Brand.radius.sm,
    padding: Brand.spacing.md,
    gap: 2,
  },
  motifLabel: { ...Typography.xs, color: Brand.colors.textMuted },
  motifText: { ...Typography.sm, color: Brand.colors.text },

  fullDate: { ...Typography.xs, color: Brand.colors.textMuted, marginTop: Brand.spacing.md },

  actions: { marginTop: Brand.spacing.lg, gap: Brand.spacing.sm },
  blockReason: { ...Typography.xs, color: Brand.colors.textMuted },
});
