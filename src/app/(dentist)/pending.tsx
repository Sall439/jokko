import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Notice } from '@/components/ui/Notice';
import { PendingRequestCard } from '@/components/domain/PendingRequestCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppointmentActions } from '@/features/dentist/useAppointmentActions';
import { useDentistSchedule } from '@/features/dentist/useDentistSchedule';
import { usePendingRequests } from '@/features/dentist/usePendingRequests';
import { confirmRefusal } from '@/features/dentist/refuseRequest';

/**
 * Onglet « En attente » : demandes à valider (A8.5).
 *
 * Le praticien confirme ou refuse les demandes reçues par les patients. Les
 * plus anciennes sont affichées en premier, pour ne pas les faire attendre
 * indéfiniment.
 */

const NO_SESSION = 'Votre compte n’est rattaché à aucune fiche praticien.';

export default function PendingScreen() {
  const schedule = useDentistSchedule();
  const pending = usePendingRequests({
    appointments: schedule.appointments,
    services: schedule.services,
    patients: schedule.patients,
    now: schedule.now,
  });
  const actions = useAppointmentActions(schedule.refresh);

  if (schedule.loading) {
    return (
      <Screen>
        <Skeleton height={160} variant="block" />
        <Skeleton height={160} variant="block" />
      </Screen>
    );
  }

  if (schedule.error) {
    return (
      <Screen>
        <ErrorState detail={schedule.error} onRetry={schedule.refresh} />
      </Screen>
    );
  }

  if (schedule.unlinked) {
    return (
      <Screen>
        <Notice tone="danger" title="Compte non rattaché">
          {NO_SESSION}
        </Notice>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={schedule.refresh} refreshing={schedule.refreshing}>
      {actions.error ? <Notice tone="danger">{actions.error}</Notice> : null}

      {pending.requests.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Aucune demande en attente"
          description="Les nouvelles demandes de rendez-vous apparaîtront ici dès que les patients les envoient."
        />
      ) : (
        <>
          <Notice tone="info" title="Demandes de réservations à valider">
            Ces demandes occupent déjà une place dans votre agenda. Confirmez-les pour les
            officialiser, ou refusez-les si le créneau ne vous convient pas.
          </Notice>

          {pending.requests.map((request) => (
            <PendingRequestCard
              key={request.id}
              request={request}
              onConfirm={(id) => void actions.act(id, 'confirm')}
              onRefuse={() => confirmRefusal(request, () => void actions.act(request.id, 'cancel'))}
              busy={actions.busyFor(request.id)}
            />
          ))}
        </>
      )}
    </Screen>
  );
}
