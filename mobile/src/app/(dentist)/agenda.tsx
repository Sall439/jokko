import { useMemo, useState } from 'react';

import { Screen } from '@/components/layout/Screen';
import { AgendaRow } from '@/components/domain/AgendaRow';
import { DateStrip } from '@/components/domain/DateStrip';
import { DayStatsBar } from '@/components/domain/DayStatsBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Notice } from '@/components/ui/Notice';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppointmentActions } from '@/features/dentist/useAppointmentActions';
import { useDayAgenda } from '@/features/dentist/useDayAgenda';
import { useDentistSchedule } from '@/features/dentist/useDentistSchedule';
import { agendaDayKeys, availableActions, pickAgendaDay } from '@/utils/practitioner';
import { fromDateKey } from '@/utils/booking';

/**
 * Onglet « Agenda » : la journée du praticien (B0).
 *
 * Compteurs du jour, planning des consultations et actions de statut. Le jour
 * affiché est le premier jour ayant un rendez-vous, aujourd'hui si l'agenda est
 * vide — jamais « demain » sous un titre qui dirait aujourd'hui.
 */

const NO_SESSION = 'Votre compte n’est rattaché à aucune fiche praticien.';

export default function AgendaScreen() {
  const schedule = useDentistSchedule();
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const actions = useAppointmentActions(schedule.refresh);

  const days = useMemo(
    () => agendaDayKeys(schedule.appointments, schedule.now),
    [schedule.appointments, schedule.now],
  );

  const dateKey = pickedKey ?? pickAgendaDay(schedule.appointments, schedule.now);

  const day = useDayAgenda({
    appointments: schedule.appointments,
    services: schedule.services,
    patients: schedule.patients,
    availability: schedule.availability,
    dentistId: schedule.dentistId,
    now: schedule.now,
    dateKey,
  });

  if (schedule.loading) {
    return (
      <Screen>
        <Skeleton height={90} variant="block" />
        <Skeleton height={140} variant="block" />
        <Skeleton height={140} variant="block" />
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
      <DayStatsBar stats={day.stats} freeSlotCount={day.freeSlotCount} />

      <DateStrip days={days.map(fromDateKey)} selectedKey={dateKey} onSelect={setPickedKey} />

      {actions.error ? <Notice tone="danger">{actions.error}</Notice> : null}

      {day.appointments.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Aucune consultation ce jour"
          description="Vous n’avez aucune consultation prévue à cette date."
        />
      ) : (
        day.appointments.map((appointment) => (
          <AgendaRow
            key={appointment.id}
            appointment={appointment}
            actions={availableActions(appointment.status)}
            onAct={(id, action) => void actions.act(id, action)}
            busy={actions.busyFor(appointment.id)}
          />
        ))
      )}
    </Screen>
  );
}
