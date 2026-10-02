import { router } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookingDone } from '@/features/booking/components/BookingDone';
import { BookingFooter } from '@/features/booking/components/BookingFooter';
import { BookingProgress } from '@/features/booking/components/BookingProgress';
import { ConfirmStep } from '@/features/booking/components/ConfirmStep';
import { DentistStep } from '@/features/booking/components/DentistStep';
import { ServiceStep } from '@/features/booking/components/ServiceStep';
import { SlotStep } from '@/features/booking/components/SlotStep';
import { useBookingFlow } from '@/features/booking/useBookingFlow';
import { getDentistDisplayName } from '@/types/dentist';

/**
 * Onglet « Réserver » : parcours en quatre étapes (A5).
 *
 * L'écran ne fait qu'ordonner le rendu et brancher les événements : l'état du
 * parcours vit dans `useBookingFlow`, les règles de créneau dans
 * `computeSlots`, le rendu de chaque étape dans `features/booking/components`.
 */

/** Onglet « Mes RDV » du même groupe de routes. */
const APPOINTMENTS_ROUTE = '/(patient)/appointments';

export default function BookScreen() {
  const flow = useBookingFlow();

  if (flow.catalog.loading) {
    return (
      <Screen>
        <Skeleton height={120} />
        <Skeleton height={120} />
      </Screen>
    );
  }

  if (flow.catalog.error) {
    return (
      <Screen>
        <ErrorState detail={flow.catalog.error} onRetry={flow.catalog.reload} />
      </Screen>
    );
  }

  const isDone = flow.step === 'done';

  return (
    <Screen
      footer={
        isDone ? null : (
          <BookingFooter
            step={flow.step}
            canContinue={flow.canContinue}
            submitting={flow.submitting}
            onBack={flow.back}
            onContinue={flow.next}
            onConfirm={() => void flow.confirm()}
          />
        )
      }
    >
      {isDone ? null : <BookingProgress stepIndex={flow.stepIndex} />}

      {flow.step === 'dentist' ? (
        <DentistStep
          dentists={flow.dentists}
          selectedId={flow.dentist?.id ?? null}
          onSelect={flow.chooseDentist}
        />
      ) : null}

      {flow.step === 'service' ? (
        <ServiceStep
          services={flow.services}
          selectedId={flow.service?.id ?? null}
          onSelect={flow.chooseService}
        />
      ) : null}

      {flow.step === 'slot' && flow.service ? (
        <SlotStep
          days={flow.bookableDays}
          selectedDateKey={flow.selectedDateKey}
          onSelectDate={flow.chooseDate}
          slots={flow.slots}
          freeSlotCount={flow.freeSlots.length}
          selectedStartMinutes={flow.selectedSlot?.startMinutes ?? null}
          onSelectSlot={flow.chooseSlot}
          durationMinutes={flow.service.durationMinutes}
          loading={flow.agenda.loading}
        />
      ) : null}

      {flow.step === 'confirm' && flow.service && flow.dentist && flow.selectedDateKey ? (
        <ConfirmStep
          dentist={flow.dentist}
          service={flow.service}
          dateKey={flow.selectedDateKey}
          startMinutes={flow.selectedSlot?.startMinutes ?? 0}
          durationMinutes={flow.service.durationMinutes}
          motif={flow.motif}
          onChangeMotif={flow.setMotif}
          submitError={flow.submitError}
        />
      ) : null}

      {isDone ? (
        <BookingDone
          appointment={flow.created}
          serviceName={flow.service?.name ?? null}
          dentistName={flow.dentist ? getDentistDisplayName(flow.dentist) : null}
          onViewAppointments={() => router.push(APPOINTMENTS_ROUTE)}
          onBookAnother={flow.reset}
        />
      ) : null}
    </Screen>
  );
}
