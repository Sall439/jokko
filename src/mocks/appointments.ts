import type { Appointment } from '@/types/appointment';
import type { User } from '@/types/auth';

/**
 * Patient de démonstration (B0) : Moussa Diop, `+221 77 452 89 10`.
 * L'identifiant correspond au compte de seed du service d'authentification.
 */
export const SEED_PATIENT_ID = 'u-patient-1';

export const SEED_PATIENT: User = {
  id: SEED_PATIENT_ID,
  firstName: 'Moussa',
  lastName: 'Diop',
  email: 'moussa.diop@jokkodent.sn',
  phone: '+221 77 452 89 10',
  role: 'patient',
};

/**
 * Rendez-vous de départ (B0). Les dates sont celles du cahier des charges ;
 * elles sont donc dans le passé par rapport à la date de lecture, ce qui est
 * voulu : le jeu de données illustre l'historique autant que l'avenir.
 *
 * Les RDV « à venir » sont recalculés par `createSeedAppointments` à partir
 * d'une date de référence, pour que la démonstration reste utilisable quel que
 * soit le jour où elle est lancée.
 */
export const SEED_APPOINTMENT_BLUEPRINTS = [
  {
    id: 'rdv-consultation-termine',
    patientId: SEED_PATIENT_ID,
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-consultation',
    status: 'termine' as const,
    /** Jours après la date de référence ; négatif = passé. */
    dayOffset: -8,
    startMinutes: 10 * 60,
    motif: undefined,
  },
  {
    id: 'rdv-urgence-confirme',
    patientId: SEED_PATIENT_ID,
    dentistId: 'dentist-fall',
    serviceId: 'service-urgence',
    status: 'confirme' as const,
    dayOffset: 2,
    startMinutes: 16 * 60,
    motif: 'Douleur aiguë, molaire du fond.',
  },
  {
    id: 'rdv-detartrage-confirme',
    patientId: SEED_PATIENT_ID,
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-detartrage',
    status: 'confirme' as const,
    dayOffset: 5,
    startMinutes: 14 * 60,
    motif: undefined,
  },
  {
    id: 'rdv-carie-attente',
    patientId: SEED_PATIENT_ID,
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-carie',
    status: 'en_attente' as const,
    dayOffset: 7,
    startMinutes: 11 * 60,
    motif: 'Sensibilité au chaud et au froid sur prémolaire supérieure gauche',
  },
  {
    id: 'rdv-fatou-termine',
    patientId: 'u-patient-2',
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-carie',
    status: 'termine' as const,
    dayOffset: -3,
    startMinutes: 9 * 60 + 30,
    motif: undefined,
  },
  {
    id: 'rdv-ibrahima-confirme',
    patientId: 'u-patient-3',
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-detartrage',
    status: 'confirme' as const,
    dayOffset: 2,
    startMinutes: 10 * 60,
    motif: 'Tartre important, gencives irritées',
  },
  {
    id: 'rdv-ndeye-attente',
    patientId: 'u-patient-4',
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-urgence',
    status: 'en_attente' as const,
    dayOffset: 3,
    startMinutes: 15 * 60,
    motif: 'Gencive gonflée et douloureuse depuis deux jours.',
  },
  {
    id: 'rdv-fatou-confirme',
    patientId: 'u-patient-2',
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-consultation',
    status: 'confirme' as const,
    dayOffset: 8,
    startMinutes: 11 * 60,
    motif: undefined,
  },
];

/** Durée des soins, résolue depuis les services de seed. */
export function resolveDurationMinutes(serviceId: string): number {
  const durations: Record<string, number> = {
    'service-detartrage': 45,
    'service-consultation': 30,
    'service-carie': 60,
    'service-blanchiment': 60,
    'service-extraction': 45,
    'service-urgence': 30,
  };
  return durations[serviceId] ?? 30;
}

/**
 * Construit les rendez-vous de seed à partir d'une date de référence.
 * La date est un jour ouvré du Dr Ndiaye pour que ses créneaux soient
 * cohérents avec ses disponibilités.
 *
 * Une demande « en attente » est créée quelques jours **avant** le rendez-vous
 * : c'est ainsi qu'une demande se présente dans le cabinet, et c'est ce qui
 * permet à l'écran « En attente » d'afficher une ancienneté crédible.
 */
export function createSeedAppointments(reference: Date): Appointment[] {
  return SEED_APPOINTMENT_BLUEPRINTS.map((blueprint) => {
    const start = nextOpenDay(reference, blueprint.dayOffset);
    const startMinutes = blueprint.startMinutes;
    const created = requestDateFor(blueprint.status, start);

    return {
      id: blueprint.id,
      patientId: blueprint.patientId,
      dentistId: blueprint.dentistId,
      serviceId: blueprint.serviceId,
      startAt: toIso(start, startMinutes),
      endAt: toIso(start, startMinutes + resolveDurationMinutes(blueprint.serviceId)),
      status: blueprint.status,
      motif: blueprint.motif,
      createdAt: toIso(created, 9 * 60),
      updatedAt: toIso(created, 9 * 60),
    } satisfies Appointment;
  });
}

/** Antériorité de la demande, en jours, selon le statut du rendez-vous. */
const REQUEST_AGE_DAYS: Record<string, number> = {
  en_attente: 4,
  confirme: 7,
  termine: 9,
  annule: 7,
};

function requestDateFor(status: string, start: Date): Date {
  const created = new Date(start);
  created.setDate(start.getDate() - (REQUEST_AGE_DAYS[status] ?? 7));
  return created;
}

/** Décale une date jusqu'à un jour où le Dr Ndiaye travaille. */
function nextOpenDay(reference: Date, dayOffset: number): Date {
  const base = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const target = new Date(base);
  target.setDate(base.getDate() + dayOffset);

  // Jours ouverts du Dr Ndiaye : lundi (1), mardi (2), mercredi (3), jeudi (4), vendredi (5).
  let guard = 0;
  while (![1, 2, 3, 4, 5].includes(target.getDay()) && guard < 7) {
    target.setDate(target.getDate() + (dayOffset >= 0 ? 1 : -1));
    guard += 1;
  }

  return target;
}

function toIso(day: Date, minutes: number): string {
  const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes, 0, 0);
  return date.toISOString();
}
