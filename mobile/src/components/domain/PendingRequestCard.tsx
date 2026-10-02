import { Feather } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Brand, Typography } from '@/constants/brand';
import { formatRelativeDay, formatTimeRange } from '@/utils/date';
import { capitalize } from '@/utils/text';
import type { AppointmentAction } from '@/types/appointment';
import type { PendingRequest } from '@/features/dentist/usePendingRequests';

/**
 * Demande de rendez-vous à valider (écran « En attente »).
 *
 * Le motif est affiché en entier : c'est la raison de la demande, et le seul
 * élément d'aide à la décision dont dispose le praticien avant de confirmer.
 *
 * Le téléphone est un lien `tel:` — le cabinet appelle, l'application ne
 * discute pas (A3).
 */

type Props = {
  request: PendingRequest;
  onConfirm: (id: string) => void;
  /** Refus : l'écran demande confirmation avant d'appeler `onRefuse` (Phase 6). */
  onRefuse: () => void;
  /** Action en cours sur cette demande, pour n'animer qu'un seul bouton. */
  busy?: AppointmentAction | null;
};

export function PendingRequestCard({ request, onConfirm, onRefuse, busy = null }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.patient}>{request.patientName}</Text>
        {request.waitingHours > 0 ? (
          <Text style={styles.waiting}>{describeWaiting(request.waitingHours)}</Text>
        ) : null}
      </View>

      <Text style={styles.service}>{request.serviceName}</Text>

      <View style={styles.row}>
        <Feather name="calendar" size={14} color={Brand.colors.textMuted} />
        <Text style={styles.meta}>{capitalize(formatRelativeDay(request.startAt))}</Text>
      </View>

      <View style={styles.row}>
        <Feather name="clock" size={14} color={Brand.colors.textMuted} />
        <Text style={styles.meta}>{formatTimeRange(request.startAt, request.endAt)}</Text>
      </View>

      {request.patientPhone ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Appeler le ${request.patientName} au ${request.patientPhone}`}
          onPress={() => void Linking.openURL(`tel:${request.patientPhone.replace(/\s/g, '')}`)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Feather name="phone" size={14} color={Brand.colors.primary} />
          <Text style={styles.phone}>{request.patientPhone}</Text>
        </Pressable>
      ) : null}

      {request.motif ? (
        <View style={styles.motif}>
          <Text style={styles.motifLabel}>Motif</Text>
          <Text style={styles.motifText}>{request.motif}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.actionSlot}>
          <Button
            label="Confirmer le RDV"
            icon="check"
            onPress={() => onConfirm(request.id)}
            loading={busy === 'confirm'}
          />
        </View>
        <View style={styles.actionSlot}>
          <Button
            label="Refuser"
            variant="outline"
            icon="x"
            onPress={onRefuse}
            loading={busy === 'cancel'}
          />
        </View>
      </View>
    </View>
  );
}

/** Ancienneté de la demande, formulée simplement. */
function describeWaiting(hours: number): string {
  if (hours < 24) return `reçue il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `reçue il y a ${days} jour${days > 1 ? 's' : ''}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    padding: Brand.spacing.lg,
    gap: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Brand.spacing.sm,
  },
  patient: { ...Typography.bodyStrong, color: Brand.colors.primaryDark, flex: 1 },
  waiting: { ...Typography.xs, color: Brand.colors.warning },
  service: { ...Typography.sm, color: Brand.colors.textMuted, marginBottom: Brand.spacing.xs },

  row: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.sm },
  meta: { ...Typography.sm, color: Brand.colors.text },
  phone: { ...Typography.smStrong, color: Brand.colors.primary },
  pressed: { opacity: 0.7 },

  motif: {
    marginTop: Brand.spacing.sm,
    backgroundColor: Brand.colors.background,
    borderRadius: Brand.radius.sm,
    padding: Brand.spacing.md,
    gap: 2,
  },
  motifLabel: { ...Typography.xs, color: Brand.colors.textMuted },
  motifText: { ...Typography.sm, color: Brand.colors.text },

  actions: { flexDirection: 'row', gap: Brand.spacing.sm, marginTop: Brand.spacing.md },
  actionSlot: { flex: 1 },
});
