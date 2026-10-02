import { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { appointmentsService } from '@/services/appointments';
import { DomainError } from '@/services/errors';
import { useAuth } from '@/features/auth/useAuth';
import { useCatalog } from '@/features/catalog/useCatalog';
import { useDentistAgenda } from '@/features/booking/useDentistAgenda';
import type { Appointment } from '@/types/appointment';
import { toDateKey } from '@/utils/booking';

/**
 * Parcours de réservation en quatre étapes : praticien, soin, date et créneau,
 * confirmation (A5).
 *
 * Le hook détient l'état du parcours ; les écrans ne font que le rendre. Toutes
 * les règles de créneau restent dans `computeSlots` et dans le service.
 */

export const BOOKING_STEPS = ['dentist', 'service', 'slot', 'confirm'] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number] | 'done';

const STEP_LABELS: Record<BookingStep, string> = {
  dentist: 'Praticien',
  service: 'Soin',
  slot: 'Date',
  confirm: 'Confirmation',
  done: 'Terminé',
};

type SubmitState = { submitting: boolean; error: string | null };

const IDLE: SubmitState = { submitting: false, error: null };

export function useBookingFlow() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ serviceId?: string }>();

  const catalog = useCatalog();
  const [step, setStep] = useState<BookingStep>('dentist');
  const [dentistId, setDentistId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [motif, setMotif] = useState('');
  const [submit, setSubmit] = useState<SubmitState>(IDLE);
  const [created, setCreated] = useState<Appointment | null>(null);

  // Le soin peut être préselectionné depuis l'onglet « Soins » : le patient a
  // déjà choisi ce qu'il veut, on ne le lui fait pas choisir deux fois.
  const effectiveServiceId = serviceId ?? params.serviceId ?? null;

  const service = catalog.services.find((item) => item.id === effectiveServiceId) ?? null;
  const dentist = catalog.dentists.find((item) => item.id === dentistId) ?? null;

  const agenda = useDentistAgenda({
    dentistId,
    serviceId: service?.id ?? null,
    durationMinutes: service?.durationMinutes ?? null,
  });

  /**
   * Date affichée : celle choisie si elle est encore réservable, sinon le
   * premier jour disponible.
   *
   * On ne remet jamais la date à zéro dans un effet : si le créneau choisi
   * disparaît parce que quelqu'un l'a pris entre-temps, l'écran bascule
   * simplement sur le premier jour qui reste, sans écran vide.
   */
  const bookableKeys = useMemo(
    () => agenda.bookableDays.map((day) => toDateKey(day)),
    [agenda.bookableDays],
  );

  const selectedDateKey = useMemo(() => {
    if (dateKey && bookableKeys.includes(dateKey)) return dateKey;
    return bookableKeys[0] ?? null;
  }, [bookableKeys, dateKey]);

  /**
   * Jour retenu, en `Date`. Mémoïsé : `new Date(...)` à chaque rendu
   * referait tous les créneaux et casserait les listes de `useMemo`.
   *
   * Rappel : la clé est `YYYY-MM-DD`, donc `new Date(key)` retombe bien sur
   * minuit **local** — pas de décalage de fuseau.
   */
  const selectedDate = useMemo(
    () => (selectedDateKey ? new Date(selectedDateKey) : null),
    [selectedDateKey],
  );

  const slots = useMemo(
    () => (selectedDate ? agenda.slotsFor(selectedDate) : []),
    [agenda, selectedDate],
  );

  const freeSlots = slots.filter((slot) => !slot.disabled);
  const selectedSlot = slots.find((slot) => slot.startMinutes === startMinutes) ?? null;

  const slotChosen = selectedSlot !== null && !selectedSlot.disabled;

  /** Un choix n'est validé que s'il aboutit à un créneau réellement libre. */
  const canContinue =
    (step === 'dentist' && dentistId !== null) ||
    (step === 'service' && service !== null) ||
    (step === 'slot' && slotChosen) ||
    (step === 'confirm' && slotChosen);

  const next = useCallback(() => {
    if (step === 'dentist') setStep(service ? 'slot' : 'service');
    else if (step === 'service') setStep('slot');
    else if (step === 'slot') setStep('confirm');
  }, [service, step]);

  const back = useCallback(() => {
    // `done` n'est pas dans la progression : depuis l'écran de confirmation
    // terminée, on ne revient pas en arrière mais on relance (voir `reset`).
    if (step === 'done') return;

    const index = BOOKING_STEPS.indexOf(step);
    if (index > 0) setStep(BOOKING_STEPS[index - 1]);
  }, [step]);

  const chooseDentist = useCallback((id: string) => {
    setDentistId(id);
    // Changer de praticien invalide le créneau choisi : le nouveau peut être libre
    // ou pas, et le patient ne doit pas réserver l'ancien horaire par erreur.
    setStartMinutes(null);
  }, []);

  const chooseService = useCallback((id: string) => {
    setServiceId(id);
    // La durée du soin change : un créneau de 30 min peut ne plus tenir.
    setStartMinutes(null);
  }, []);

  const chooseDate = useCallback((key: string) => {
    setDateKey(key);
    setStartMinutes(null);
  }, []);

  const chooseSlot = useCallback((minutes: number) => {
    setStartMinutes(minutes);
    setSubmit(IDLE);
  }, []);

  const confirm = useCallback(async () => {
    if (!user || !dentist || !service || !selectedDate || !slotChosen || !selectedSlot) return;

    setSubmit({ submitting: true, error: null });

    try {
      const appointment = await appointmentsService.requestAppointment({
        patientId: user.id,
        dentistId: dentist.id,
        serviceId: service.id,
        startMinutes: selectedSlot.startMinutes,
        date: selectedDate,
        motif: motif.trim() || undefined,
      });

      setCreated(appointment);
      setStep('done');
      setSubmit(IDLE);
      agenda.reload();
    } catch (error) {
      setSubmit({
        submitting: false,
        error:
          error instanceof DomainError
            ? error.message
            : "La demande n'a pas pu être enregistrée. Réessayez.",
      });
    }
  }, [agenda, dentist, motif, selectedDate, selectedSlot, service, slotChosen, user]);

  /** Revient au début en conservant les choix : « Réserver un autre rendez-vous ». */
  const reset = useCallback(() => {
    setStep('dentist');
    setDateKey(null);
    setStartMinutes(null);
    setMotif('');
    setCreated(null);
    setSubmit(IDLE);
  }, []);

  return {
    step,
    stepLabel: STEP_LABELS[step],
    stepIndex: step === 'done' ? BOOKING_STEPS.length : BOOKING_STEPS.indexOf(step),

    catalog,
    dentists: catalog.dentists,
    services: catalog.services,
    dentist,
    service,

    agenda,
    bookableDays: agenda.bookableDays,
    slots,
    freeSlots,
    selectedSlot,
    selectedDateKey,
    selectedDate,

    motif,
    setMotif,

    chooseDentist,
    chooseService,
    chooseDate,
    chooseSlot,

    canContinue,
    next,
    back,
    confirm,
    reset,
    submitting: submit.submitting,
    submitError: submit.error,
    created,
  };
}

/** Libellé d'une étape, pour la barre de progression. */
export function getStepLabel(step: BookingStep): string {
  return STEP_LABELS[step];
}
