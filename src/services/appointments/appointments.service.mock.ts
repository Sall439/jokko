import { createSeedAppointments } from '@/mocks/appointments';
import { DomainError, wait } from '@/services/errors';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { canTransition } from '@/types/appointment';
import {
  blocksAgenda,
  CANCELLATION_TOO_LATE_MESSAGE,
  canPatientCancel,
  overlapsInterval,
  type IntervalMs,
} from '@/utils/appointments';
import type { WeeklyAvailability } from '@/types/availability';
import { getWeekdayIndex } from '@/types/availability';
import { DEFAULT_DURATION_MINUTES, isSlotAvailable } from '@/utils/slots';

/** Contrat du domaine « rendez-vous » : mock aujourd'hui, API REST en Phase 7. */
export interface IAppointmentsService {
  /** Rendez-vous d'un patient, du plus récent au plus ancien. */
  listForPatient(patientId: string, now?: Date): Promise<Appointment[]>;
  /** Rendez-vous d'un dentiste, tous statuts confondus. */
  listForDentist(dentistId: string, now?: Date): Promise<Appointment[]>;
  getById(id: string): Promise<Appointment>;
  /**
   * Crée un rendez-vous à la demande d'un patient. Toujours `en_attente` (A8.6) ;
   * c'est le dentiste qui confirme ou refuse.
   */
  requestAppointment(input: RequestAppointmentInput): Promise<Appointment>;
  confirm(id: string): Promise<Appointment>;
  cancelByPatient(id: string, now?: Date): Promise<Appointment>;
  cancelByDentist(id: string): Promise<Appointment>;
  complete(id: string): Promise<Appointment>;
}

export interface RequestAppointmentInput {
  patientId: string;
  dentistId: string;
  serviceId: string;
  /** Début du rendez-vous, en minutes depuis minuit. */
  startMinutes: number;
  /**
   * Durée du soin en minutes ; la fin en découle (A8.3).
   * Absente : le service la résout depuis le catalogue via
   * `serviceDurationResolver`.
   */
  durationMinutes?: number;
  /** Jour visé, à minuit local. */
  date: Date;
  motif?: string;
  now?: Date;
  serviceDurationResolver?: (serviceId: string) => number | undefined;
  /**
   * Disponibilités du dentiste. Peut être asynchrone : l'application lit le
   * service « disponibilités », qui est lui-même asynchrone.
   */
  availabilityResolver?: (dentistId: string) => WeeklyAvailability | Promise<WeeklyAvailability>;
}

/**
 * Magasin en mémoire. Les RDV de seed sont recalculés à partir de la date du
 * premier accès, afin que la démonstration reste cohérente même relancée
 * plusieurs jours plus tard.
 */
let store: Appointment[] | null = null;

function appointments(now: Date = new Date()): Appointment[] {
  if (!store) store = createSeedAppointments(now);
  return store;
}

/**
 * Réinitialise le magasin et le reconstruit pour une date de référence donnée.
 *
 * Les tests passent leur propre `NOW` : sans cela, les rendez-vous de seed
 * seraient ancrés sur la date réelle du jour, et un test qui réserve le mardi
 * à 10 h commencerait à échouer selon le jour où la suite est lancée.
 */
export function __resetAppointments(reference: Date = new Date()): void {
  store = createSeedAppointments(reference);
}

function toInterval(appointment: Appointment): IntervalMs {
  return {
    startMs: new Date(appointment.startAt).getTime(),
    endMs: new Date(appointment.endAt).getTime(),
  };
}

/** Construit les bornes `[début, fin[` d'un rendez-vous en cours de création. */
function buildAppointment(input: RequestAppointmentInput, id: string): Appointment {
  const duration = input.durationMinutes || input.serviceDurationResolver?.(input.serviceId) || 30;

  const start = new Date(input.date);
  start.setHours(0, input.startMinutes, 0, 0);
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + duration);

  const timestamp = new Date().toISOString();

  return {
    id,
    patientId: input.patientId,
    dentistId: input.dentistId,
    serviceId: input.serviceId,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    // A8.6 : une demande de patient démarre toujours « en attente ».
    status: 'en_attente',
    motif: input.motif?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const mockAppointmentsService: IAppointmentsService = {
  async listForPatient(patientId, now = new Date()) {
    await wait();
    return appointments(now)
      .filter((appointment) => appointment.patientId === patientId)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  },

  async listForDentist(dentistId, now = new Date()) {
    await wait();
    return appointments(now)
      .filter((appointment) => appointment.dentistId === dentistId)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  },

  async getById(id) {
    await wait();
    const found = appointments().find((appointment) => appointment.id === id);
    if (!found) throw new DomainError('NOT_FOUND', "Ce rendez-vous n'existe pas.");
    return found;
  },

  async requestAppointment(input) {
    await wait();
    const now = input.now ?? new Date();
    const duration =
      input.durationMinutes ||
      input.serviceDurationResolver?.(input.serviceId) ||
      DEFAULT_DURATION_MINUTES;

    // A8.2 : jamais dans le passé.
    const start = new Date(input.date);
    start.setHours(0, input.startMinutes, 0, 0);
    if (start.getTime() <= now.getTime()) {
      throw new DomainError(
        'SLOT_IN_PAST',
        'Ce créneau est déjà passé. Choisissez une date à venir.',
      );
    }

    // A8.2 : le créneau doit exister dans les disponibilités déclarées.
    const availability = await input.availabilityResolver?.(input.dentistId);
    if (availability) {
      const workingDay = availability[getWeekdayIndex(start)];
      if (!workingDay) {
        throw new DomainError('OUTSIDE_AVAILABILITY', 'Le cabinet ne travaille pas ce jour-là.');
      }
      if (
        !isSlotAvailable(
          {
            dentistId: input.dentistId,
            availability,
            appointments: appointments(now),
            serviceDuration: duration,
            date: start,
            now,
          },
          input.startMinutes,
        )
      ) {
        throw new DomainError('SLOT_UNAVAILABLE', "Ce créneau n'est plus disponible.");
      }
    }

    const candidate = buildAppointment(input, `rdv-${appointments(now).length + 1}`);
    const candidateInterval = toInterval(candidate);

    // A8.1 : deux rendez-vous d'un même dentiste ne se chevauchent pas.
    // Ce contrôle est refait ici même si `availabilityResolver` a déjà filtré les
    // créneaux : c'est la règle qui protège le cabinet, elle ne doit pas
    // dépendre du fait qu'un écran ait résolu les disponibilités.
    const conflict = appointments(now).find(
      (existing) =>
        existing.dentistId === candidate.dentistId &&
        blocksAgenda(existing) &&
        overlapsInterval(candidateInterval, toInterval(existing)),
    );

    if (conflict) {
      throw new DomainError('OVERLAP', 'Un autre rendez-vous occupe déjà ce créneau.');
    }

    appointments(now).push(candidate);
    return candidate;
  },

  async confirm(id) {
    await wait();
    return transition(id, 'confirme');
  },

  async complete(id) {
    await wait();
    return transition(id, 'termine');
  },

  async cancelByDentist(id) {
    await wait();
    return transition(id, 'annule');
  },

  async cancelByPatient(id, now = new Date()) {
    await wait();
    const found = appointments(now).find((appointment) => appointment.id === id);
    if (!found) throw new DomainError('NOT_FOUND', "Ce rendez-vous n'existe pas.");

    // A8.4 : délai de 24 h avant le début.
    if (!canPatientCancel(found, now)) {
      throw new DomainError('CANCELLATION_TOO_LATE', CANCELLATION_TOO_LATE_MESSAGE);
    }

    return transition(id, 'annule');
  },
};

/**
 * Applique une transition de statut en respectant la table d'A8.5.
 * `termine` et `annule` sont finaux : toute transition depuis ces états est
 * refusée avec `INVALID_TRANSITION`.
 */
function transition(id: string, to: AppointmentStatus): Appointment {
  const appointment = appointments().find((item) => item.id === id);
  if (!appointment) throw new DomainError('NOT_FOUND', "Ce rendez-vous n'existe pas.");

  // Ré-idempotent : confirmer deux fois un rendez-vous déjà confirmé ne doit pas
  // être une erreur, le résultat est le même.
  if (appointment.status === to) return appointment;

  if (!canTransition(appointment.status, to)) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `Un rendez-vous « ${appointment.status} » ne peut pas passer à « ${to} ».`,
    );
  }

  appointment.status = to;
  appointment.updatedAt = new Date().toISOString();
  return appointment;
}
