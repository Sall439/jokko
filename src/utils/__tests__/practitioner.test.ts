import type { Appointment } from '@/types/appointment';
import { SEED_PATIENTS } from '@/mocks/patients';
import {
  agendaDayKeys,
  appointmentsOnDay,
  availableActions,
  computeDayStats,
  listAgendaDays,
  pickAgendaDay,
  resolveForPractitioner,
  resolveForPractitionerList,
  sortPendingRequests,
} from '@/utils/practitioner';

/**
 * Vue praticien sur ses rendez-vous : résolution, compteurs, navigation et
 * actions autorisées.
 *
 * Ces fonctions décident de ce que le dentiste voit ; elles sont donc testées
 * sans rendu, y compris pour les transitions affichées (A8.5).
 */

/** Lundi 5 octobre 2026, 08 h. */
const NOW = new Date(2026, 9, 5, 8, 0, 0, 0);
const MONDAY = new Date(2026, 9, 5);
const TUESDAY = new Date(2026, 9, 6);
/** Jeudi 8 octobre 2026, jour ouvré. */
const THURSDAY = new Date(2026, 9, 8);
/** Samedi 10 octobre 2026, jour fermé. */
const SATURDAY = new Date(2026, 9, 10);

function at(day: Date, minutes: number): string {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes).toISOString();
}

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'rdv-1',
    patientId: 'u-patient-1',
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-consultation',
    startAt: at(TUESDAY, 10 * 60),
    endAt: at(TUESDAY, 10 * 60 + 30),
    status: 'confirme',
    createdAt: at(TUESDAY, 8 * 60),
    updatedAt: at(TUESDAY, 8 * 60),
    ...overrides,
  };
}

describe('resolveForPractitioner — résolution des libellés', () => {
  it('résout le nom du patient et le soin', () => {
    const resolved = resolveForPractitioner(appointment(), SEED_PATIENTS, [
      { id: 'service-consultation', name: 'Consultation' },
    ]);

    expect(resolved.patientName).toBe('Moussa Diop');
    expect(resolved.patientPhone).toBe('+221 77 452 89 10');
    expect(resolved.serviceName).toBe('Consultation');
  });

  it('ne lève jamais quand un identifiant est inconnu', () => {
    const resolved = resolveForPractitioner(
      appointment({ patientId: 'inconnu', serviceId: 'inconnu' }),
      SEED_PATIENTS,
      [],
    );

    expect(resolved.patientName).toBe('Patient non précisé');
    expect(resolved.serviceName).toBe('Soin non précisé');
    expect(resolved.patientPhone).toBe('');
  });

  it('applique la résolution à une liste', () => {
    const list = resolveForPractitionerList([appointment()], SEED_PATIENTS, []);

    expect(list).toHaveLength(1);
    expect(list[0].serviceName).toBe('Soin non précisé');
  });
});

describe('computeDayStats — compteurs du jour (B0)', () => {
  it('compte chaque statut et les rendez-vous occupants', () => {
    const stats = computeDayStats([
      appointment({ id: 'a', status: 'confirme' }),
      appointment({ id: 'b', status: 'en_attente' }),
      appointment({ id: 'c', status: 'termine' }),
      appointment({ id: 'd', status: 'annule' }),
    ]);

    expect(stats).toEqual({
      total: 4,
      en_attente: 1,
      confirme: 1,
      termine: 1,
      annule: 1,
      blocking: 2,
    });
  });

  it('renvoie des compteurs à zéro pour une journée vide', () => {
    expect(computeDayStats([])).toEqual({
      total: 0,
      en_attente: 0,
      confirme: 0,
      termine: 0,
      annule: 0,
      blocking: 0,
    });
  });
});

describe('availableActions — transitions proposées (A8.5)', () => {
  it('propose confirmer et annuler depuis « en attente »', () => {
    expect(availableActions('en_attente')).toEqual(['confirm', 'cancel']);
  });

  it('propose terminé et annuler depuis « confirmé »', () => {
    expect(availableActions('confirme')).toEqual(['complete', 'cancel']);
  });

  it('ne propose rien sur un statut final', () => {
    expect(availableActions('termine')).toEqual([]);
    expect(availableActions('annule')).toEqual([]);
  });
});

describe('Navigation dans l’agenda', () => {
  const agenda = [
    appointment({
      id: 'mar',
      startAt: at(MONDAY, 9 * 60),
      endAt: at(MONDAY, 9 * 60 + 30),
    }),
    appointment({
      id: 'jeu',
      startAt: at(THURSDAY, 10 * 60),
      endAt: at(THURSDAY, 10 * 60 + 30),
    }),
    appointment({
      id: 'passe',
      startAt: at(new Date(2026, 8, 1), 10 * 60),
      endAt: at(new Date(2026, 8, 1), 10 * 60 + 30),
    }),
  ];

  it('sélectionne les rendez-vous d’un jour local', () => {
    expect(appointmentsOnDay(agenda, MONDAY).map((a) => a.id)).toEqual(['mar']);
  });

  it('ne prend rien sur un jour sans rendez-vous', () => {
    expect(appointmentsOnDay(agenda, SATURDAY)).toEqual([]);
  });

  it('classe les rendez-vous du jour par heure croissante', () => {
    const two = [
      appointment({
        id: 'b',
        startAt: at(MONDAY, 15 * 60),
        endAt: at(MONDAY, 15 * 60 + 30),
      }),
      appointment({
        id: 'a',
        startAt: at(MONDAY, 9 * 60),
        endAt: at(MONDAY, 9 * 60 + 30),
      }),
    ];

    expect(appointmentsOnDay(two, MONDAY).map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('liste les jours à venir ayant un rendez-vous, jamais le passé', () => {
    expect(listAgendaDays(agenda, NOW)).toEqual(['2026-10-05', '2026-10-08']);
  });

  it('ajoute toujours aujourd’hui au bandeau', () => {
    expect(agendaDayKeys([], NOW)).toEqual(['2026-10-05']);
  });

  it('ouvre sur aujourd’hui si le jour a des rendez-vous', () => {
    expect(pickAgendaDay(agenda, NOW)).toBe('2026-10-05');
  });

  it('ouvre sur le premier jour occupé si aujourd’hui est libre', () => {
    const future = [
      appointment({
        id: 'jeu',
        startAt: at(THURSDAY, 10 * 60),
        endAt: at(THURSDAY, 10 * 60 + 30),
      }),
    ];

    expect(pickAgendaDay(future, NOW)).toBe('2026-10-08');
  });

  it('ouvre sur aujourd’hui si rien n’est prévu', () => {
    expect(pickAgendaDay([], NOW)).toBe('2026-10-05');
  });
});

describe('Demandes à valider', () => {
  const resolved = resolveForPractitionerList(
    [
      appointment({ id: 'recente', status: 'en_attente', createdAt: at(TUESDAY, 9 * 60) }),
      appointment({ id: 'ancienne', status: 'en_attente', createdAt: at(MONDAY, 9 * 60) }),
      appointment({ id: 'confirme', status: 'confirme' }),
    ],
    SEED_PATIENTS,
    [],
  );

  it('ne garde que les demandes en attente, les plus anciennes d’abord', () => {
    expect(sortPendingRequests(resolved).map((a) => a.id)).toEqual(['ancienne', 'recente']);
  });

  it('ne modifie pas la liste reçue', () => {
    sortPendingRequests(resolved);

    expect(resolved).toHaveLength(3);
  });
});
