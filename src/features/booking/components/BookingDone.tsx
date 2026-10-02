import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Brand, Typography } from '@/constants/brand';
import type { Appointment } from '@/types/appointment';
import { formatLongDate, formatTimeRange } from '@/utils/date';
import { capitalize } from '@/utils/text';

type Props = {
  /** Rendez-vous réellement enregistré, pour le récapitulatif. */
  appointment: Appointment | null;
  serviceName: string | null;
  dentistName: string | null;
  onViewAppointments: () => void;
  onBookAnother: () => void;
};

/**
 * Dernier écran du parcours : la demande a été transmise.
 *
 * Aucune redirection automatique (A6.1) : le patient choisit où aller ensuite.
 * On lui montre ce qui a été retenu, parce qu'une demande « en attente » n'est
 * pas encore un rendez-vous confirmé.
 *
 * Pure : props entrantes, deux événements sortants.
 */
export function BookingDone({
  appointment,
  serviceName,
  dentistName,
  onViewAppointments,
  onBookAnother,
}: Props) {
  return (
    <View style={styles.section}>
      <Notice tone="success" title="Demande envoyée">
        Votre demande a bien été transmise au cabinet. Elle reste « en attente » jusqu&apos;à
        confirmation.
      </Notice>

      {appointment ? (
        <Card>
          <StatusBadge status={appointment.status} />

          {serviceName ? <Text style={styles.service}>{serviceName}</Text> : null}
          {dentistName ? <Text style={styles.dentist}>{dentistName}</Text> : null}

          <Text style={styles.when}>
            {capitalize(formatLongDate(appointment.startAt))} —{' '}
            {formatTimeRange(appointment.startAt, appointment.endAt)}
          </Text>
        </Card>
      ) : null}

      <Button label="Voir mes rendez-vous" icon="calendar" onPress={onViewAppointments} />
      <Button
        label="Réserver un autre rendez-vous"
        variant="outline"
        icon="plus"
        onPress={onBookAnother}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Brand.spacing.md },

  service: {
    ...Typography.bodyStrong,
    color: Brand.colors.primaryDark,
    marginTop: Brand.spacing.md,
  },
  dentist: { ...Typography.sm, color: Brand.colors.textMuted },
  when: { ...Typography.sm, color: Brand.colors.text, marginTop: Brand.spacing.sm },
});
