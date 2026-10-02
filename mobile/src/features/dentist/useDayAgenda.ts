import { useMemo } from 'react';

import { computeSlots } from '@/utils/slots';
import { toDateKey } from '@/utils/booking';
import {
  appointmentsOnDay,
  computeDayStats,
  resolveForPractitionerList,
  type DayStats,
  type ResolvedForPractitioner,
} from '@/utils/practitioner';
import type { Appointment } from '@/types/appointment';
import type { WeeklyAvailability } from '@/types/availability';
import type { Patient } from '@/types/patient';
import type { Service } from '@/types/service';

/**
 * Vue d'une journée de l'agenda du praticien (B0).
 *
 * Dérivation **pure** à partir des données déjà chargées : les consultations du
 * jour, les compteurs par statut, et les créneaux restants. Aucune requête
 * supplémentaire — changer de jour est instantané.
 */

/**
 * Durée de référence pour compter les créneaux libres.
 *
 * Dix minutes : on veut savoir « combien de rendez-vous de dix minutes
 * rentreraient encore aujourd'hui », pas simuler un soin précis. La durée réelle
 * d'un soin est connue au moment de la réservation ; ici elle ne ferait que
 * surévaluer le nombre de place disponibles.
 */
const PROBE_DURATION_MINUTES = 10;

export interface DayAgenda {
  /** Clé `YYYY-MM-DD` du jour affiché. */
  dateKey: string;
  date: Date;
  appointments: ResolvedForPractitioner[];
  stats: DayStats;
  /** Créneaux encore libres ce jour-là. */
  freeSlotCount: number;
  /** Minutes de travail déjà prises, pauses comprises. */
  bookedMinutes: number;
}

type Params = {
  appointments: Appointment[];
  services: Service[];
  patients: Patient[];
  availability: WeeklyAvailability;
  /** Praticien connecté ; `null` seulement le temps du chargement. */
  dentistId: string | null;
  now: Date;
  /** Clé `YYYY-MM-DD` du jour affiché. */
  dateKey: string | null;
};

export function useDayAgenda({
  appointments,
  services,
  patients,
  availability,
  dentistId,
  now,
  dateKey,
}: Params): DayAgenda {
  return useMemo(() => {
    const date = dateKey ? new Date(dateKey) : now;
    const dayAppointments = appointmentsOnDay(appointments, date);

    // Sans praticien identifié, aucun créneau ne peut être attribué : on en
    // compte zéro plutôt que de tout/free, ce qui serait un chiffre faux.
    const slots =
      dentistId === null
        ? []
        : computeSlots({
            dentistId,
            availability,
            appointments,
            serviceDuration: PROBE_DURATION_MINUTES,
            date,
            now,
          });

    return {
      dateKey: toDateKey(date),
      date,
      appointments: resolveForPractitionerList(dayAppointments, patients, services),
      stats: computeDayStats(dayAppointments),
      freeSlotCount: slots.filter((slot) => !slot.disabled).length,
      bookedMinutes: dayAppointments.reduce(
        (total, appointment) =>
          total +
          Math.max(
            0,
            (new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) /
              60000,
          ),
        0,
      ),
    };
  }, [appointments, availability, dateKey, dentistId, now, patients, services]);
}
