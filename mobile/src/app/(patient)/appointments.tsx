import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { AppointmentCard } from '@/components/domain/AppointmentCard';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Notice } from '@/components/ui/Notice';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand } from '@/constants/brand';
import {
  getCancellationBlockReason,
  useCancelAppointment,
} from '@/features/appointments/useCancelAppointment';
import { usePatientAppointments } from '@/features/appointments/usePatientAppointments';
import {
  APPOINTMENT_FILTERS,
  canPatientCancel,
  type AppointmentFilterId,
} from '@/utils/appointments';

/**
 * Onglet « Mes RDV » (A5) : filtres par statut, cartes avec annulation possible
 * jusqu'à 24 h avant (A8.4). L'écran ne fait que renderer ; le chargement, le
 * tri et les filtres vivent dans les hooks.
 */

/** Onglet « Réserver » du même groupe de routes. */
const BOOK_ROUTE = '/(patient)/book';

export default function AppointmentsScreen() {
  const { appointments, counts, filter, setFilter, loading, refreshing, error, refresh } =
    usePatientAppointments();
  const { cancel, cancellingId, error: cancelError } = useCancelAppointment(refresh);

  if (error) {
    return (
      <Screen>
        <ErrorState detail={error} onRetry={refresh} retrying={refreshing} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {APPOINTMENT_FILTERS.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            count={counts[item.id]}
            selected={filter === item.id}
            onPress={() => setFilter(item.id)}
          />
        ))}
      </ScrollView>

      {cancelError ? <Notice tone="danger">{cancelError}</Notice> : null}

      {loading ? (
        <>
          <Skeleton height={150} />
          <Skeleton height={150} />
        </>
      ) : appointments.length === 0 ? (
        <EmptyPanel filter={filter} />
      ) : (
        <View style={styles.list}>
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              cancellable={canPatientCancel(appointment)}
              blockReason={getCancellationBlockReason(appointment)}
              cancelling={cancellingId === appointment.id}
              onCancel={(id) => void cancel(id)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** Sortie de l'écran vide : le patient n'a rien à faire d'autre que réserver. */
function EmptyPanel({ filter }: { filter: AppointmentFilterId }) {
  if (filter === 'en_attente') {
    return (
      <EmptyState
        icon="clock"
        title="Aucune demande en attente"
        description="Vos demandes de rendez-vous apparaîtront ici tant que le cabinet ne les aura pas confirmées."
      />
    );
  }

  if (filter === 'confirme') {
    return (
      <EmptyState
        icon="calendar"
        title="Aucun rendez-vous confirmé"
        description="Dès que le cabinet confirme une de vos demandes, le rendez-vous apparaît ici."
      />
    );
  }

  if (filter === 'historique') {
    return (
      <EmptyState
        icon="archive"
        title="Votre historique est vide"
        description="Vos rendez-vous passés et annulés resteront consultables ici."
      />
    );
  }

  return (
    <EmptyState
      icon="calendar"
      title="Aucun rendez-vous pour le moment"
      description="Réservez votre première consultation depuis l'onglet Réserver."
      actionLabel="Réserver un rendez-vous"
      onAction={() => router.push(BOOK_ROUTE)}
    />
  );
}

const styles = StyleSheet.create({
  filters: { gap: Brand.spacing.sm, paddingVertical: Brand.spacing.xs },
  list: { gap: Brand.spacing.md },
});
