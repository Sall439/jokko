import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import type { ButtonVariant } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Brand, Typography } from '@/constants/brand';
import { formatTimeRange } from '@/utils/date';
import type { AppointmentAction } from '@/types/appointment';
import type { FeatherIconName } from '@/types/ui';
import type { ResolvedForPractitioner } from '@/utils/practitioner';

/**
 * Ligne d'agenda vue par le praticien : patient, soin, horaire, motif, statut
 * et les actions permises par le transition en cours (A8.5).
 *
 * Le composant ne décide pas quelles actions proposer : `actions` vient de
 * `availableActions`, qui traduit `STATUS_TRANSITIONS`. Aucune action n'est donc
 * proposée sur un rendez-vous clôturé, et le service refuse de toute façon une
 * transition interdite.
 */

type Props = {
  appointment: ResolvedForPractitioner;
  /** Actions autorisées depuis le statut courant. */
  actions: AppointmentAction[];
  onAct: (id: string, action: AppointmentAction) => void;
  /** Action en cours sur ce rendez-vous, pour n'animer qu'un seul bouton. */
  busy?: AppointmentAction | null;
};

/**
 * Libellé, icône et importance de chaque action.
 *
 * « Clôturer / Terminé » est l'action principale du praticien sur une
 * consultation du jour : elle est donc mise en avant, l'annulation reste
 * l'action secondaire, juste en dessous.
 */
const ACTION_PRESENTATION: Record<
  AppointmentAction,
  { label: string; icon: FeatherIconName; variant: ButtonVariant }
> = {
  confirm: { label: 'Confirmer le RDV', icon: 'check', variant: 'primary' },
  complete: { label: 'Clôturer / Terminé', icon: 'check-circle', variant: 'primary' },
  cancel: { label: 'Annuler le rendez-vous', icon: 'x', variant: 'outline' },
};

/** Les actions d'un rendez-vous, de la plus importante à la moins. */
const ACTION_ORDER: AppointmentAction[] = ['confirm', 'complete', 'cancel'];

export function AgendaRow({ appointment, actions, onAct, busy = null }: Props) {
  // L'ordre d'appel vient du statut, pas de l'écran : on le réordonne ici pour
  // que l'action principale reste en haut de la carte.
  const ordered = ACTION_ORDER.filter((action) => actions.includes(action));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.time}>{formatTimeRange(appointment.startAt, appointment.endAt)}</Text>
        <StatusBadge status={appointment.status} size="sm" />
      </View>

      <Text style={styles.patient}>{appointment.patientName}</Text>
      <Text style={styles.service}>{appointment.serviceName}</Text>

      {appointment.motif ? (
        <Text style={styles.motif} numberOfLines={2}>
          « {appointment.motif} »
        </Text>
      ) : null}

      {ordered.length > 0 ? (
        <View style={styles.actions}>
          {ordered.map((action) => (
            <Button
              key={action}
              label={ACTION_PRESENTATION[action].label}
              icon={ACTION_PRESENTATION[action].icon}
              variant={ACTION_PRESENTATION[action].variant}
              onPress={() => onAct(appointment.id, action)}
              loading={busy === action}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    padding: Brand.spacing.lg,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Brand.spacing.sm,
    marginBottom: Brand.spacing.sm,
  },
  time: { ...Typography.bodyStrong, color: Brand.colors.primary },
  patient: { ...Typography.bodyStrong, color: Brand.colors.primaryDark },
  service: { ...Typography.sm, color: Brand.colors.textMuted },
  motif: { ...Typography.xs, color: Brand.colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  actions: { gap: Brand.spacing.sm, marginTop: Brand.spacing.md },
});
