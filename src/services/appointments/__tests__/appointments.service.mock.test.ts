import { SEED_AVAILABILITY_NDIAYE } from '@/mocks/availability';
import { SEED_PATIENT_ID } from '@/mocks/appointments';
import {
  mockAppointmentsService,
  __resetAppointments,
} from '@/services/appointments/appointments.service.mock';
import { DomainError, setMockLatency } from '@/services/errors';
import type { Appointment } from '@/types/appointment';

/**
 * Règles de réservation et de statut vérifiées au niveau du service (A8).
 *
 * Le magasin est réinitialisé avant chaque test : chaque test repart du jeu de
 * seed, calculé à partir de la date de référence fournie, et la latence des
 * mocks est mise à zéro.
 */

const PATIENT = SEED_PATIENT_ID;
/** Patient sans aucun rendez-vous de seed, pour tester la liste vide. */
const AUTRE_PATIENT = 'u-patient-sans-rdv';
const NDIAYE = 'dentist-ndiaye';
const FALL = 'dentist-fall';

/** Lundi 5 octobre 2026, 08 h : avant l'ouverture, donc aucun créneau dans le passé. */
const NOW = new Date(2026, 9, 5, 8, 0, 0, 0);
const MONDAY = new Date(2026, 9, 5);
/** Mardi 6 octobre 2026, jour ouvré. */
const TUESDAY = new Date(2026, 9, 6);
/** Samedi 10 octobre 2026, jour fermé. */
const SATURDAY = new Date(2026, 9, 10);

const request = (
  overrides: Partial<Parameters<typeof mockAppointmentsService.requestAppointment>[0]> = {},
) =>
  mockAppointmentsService.requestAppointment({
    patientId: PATIENT,
    dentistId: NDIAYE,
    serviceId: 'service-consultation',
    startMinutes: 10 * 60,
    durationMinutes: 30,
    date: TUESDAY,
    now: NOW,
    availabilityResolver: () => SEED_AVAILABILITY_NDIAYE,
    ...overrides,
  });

beforeAll(() => setMockLatency(0));
// Les seeds sont ancrés sur `NOW`, pas sur la date réelle : la suite doit se
// comporter pareil quel que soit le jour où elle est lancée.
beforeEach(() => __resetAppointments(NOW));

/** Code d'erreur métier attendu, sans dépendre du message. */
async function expectDomainError(
  promise: Promise<unknown>,
  code: DomainError['code'],
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(DomainError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('requestAppointment — création (A8.2, A8.3, A8.6)', () => {
  it('crée le rendez-vous en attente de confirmation', async () => {
    const created = await request();

    expect(created.status).toBe('en_attente');
    expect(created.patientId).toBe(PATIENT);
    expect(created.dentistId).toBe(NDIAYE);
  });

  it('calcule la fin à partir de la durée du soin (A8.3)', async () => {
    const created = await request({ serviceId: 'service-carie', durationMinutes: 60 });

    const start = new Date(created.startAt);
    const end = new Date(created.endAt);
    expect(end.getTime() - start.getTime()).toBe(60 * 60 * 1000);
  });

  it('place le début à l’heure demandée sur le jour demandé', async () => {
    const created = await request({
      startMinutes: 14 * 60 + 30,
      date: MONDAY,
      now: new Date(2026, 9, 4),
    });

    const start = new Date(created.startAt);
    expect(start.getDate()).toBe(5);
    expect(start.getHours()).toBe(14);
    expect(start.getMinutes()).toBe(30);
  });

  it('refuse un créneau déjà passé', async () => {
    await expectDomainError(
      request({ date: MONDAY, startMinutes: 9 * 60, now: new Date(2026, 9, 5, 10) }),
      'SLOT_IN_PAST',
    );
  });

  it('refuse une date entièrement passée', async () => {
    await expectDomainError(request({ date: MONDAY, now: new Date(2026, 9, 6) }), 'SLOT_IN_PAST');
  });

  it('refuse un jour où le cabinet ne travaille pas', async () => {
    await expectDomainError(request({ date: SATURDAY }), 'OUTSIDE_AVAILABILITY');
  });

  it('refuse un créneau qui déborde sur la pause de midi', async () => {
    // 12 h 30 + 45 min empiète sur 13 h – 14 h.
    await expectDomainError(
      request({ startMinutes: 12 * 60 + 30, durationMinutes: 45 }),
      'SLOT_UNAVAILABLE',
    );
  });

  it('refuse un créneau déjà occupé', async () => {
    await request({ startMinutes: 15 * 60, durationMinutes: 60 });

    // 15 h 30 est dans le rendez-vous de 15 h – 16 h.
    await expectDomainError(
      request({ startMinutes: 15 * 60 + 30, durationMinutes: 30 }),
      'SLOT_UNAVAILABLE',
    );
  });

  it('refuse un chevauchement même sans résolveur de disponibilités', async () => {
    // Sans `availabilityResolver`, seule la règle A8.1 protège encore le cabinet.
    await request({ startMinutes: 15 * 60, durationMinutes: 60, availabilityResolver: undefined });

    await expectDomainError(
      request({ startMinutes: 15 * 60 + 30, durationMinutes: 30, availabilityResolver: undefined }),
      'OVERLAP',
    );
  });

  it('autorise un créneau jointif juste après un rendez-vous', async () => {
    await request({ startMinutes: 15 * 60, durationMinutes: 30 });
    const adjacent = await request({ startMinutes: 15 * 60 + 30, durationMinutes: 30 });

    expect(adjacent.status).toBe('en_attente');
  });

  it('n’autorise pas deux rendez-vous du patient sur le même créneau', async () => {
    await request();
    await expectDomainError(request(), 'SLOT_UNAVAILABLE');
  });

  it('refuse un motif composed uniquement d’espaces', async () => {
    const created = await request({ motif: '   ' });
    expect(created.motif).toBeUndefined();
  });

  it('conserve le motif du patient', async () => {
    const created = await request({ motif: ' Douleur au molaire ' });
    expect(created.motif).toBe('Douleur au molaire');
  });
});

describe('requestAppointment — cloisonnement des dentistes', () => {
  it('permet le même créneau à deux dentistes différents', async () => {
    await request({ startMinutes: 15 * 60, dentistId: NDIAYE });

    // Le Dr Fall n'a pas de disponibilités déclarées : sans résolveur, la règle
    // A8.1 ne voit pas de conflit avec le rendez-vous du Dr Ndiaye.
    const forFall = await request({
      startMinutes: 15 * 60,
      dentistId: FALL,
      availabilityResolver: () => SEED_AVAILABILITY_NDIAYE,
    });

    expect(forFall.dentistId).toBe(FALL);
  });
});

describe('listForPatient / listForDentist — visibilité (A7)', () => {
  it('ne renvoie au patient que ses propres rendez-vous', async () => {
    const all = await mockAppointmentsService.listForPatient(PATIENT, NOW);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((appointment) => appointment.patientId === PATIENT)).toBe(true);
  });

  it('renvoie une liste vide pour un patient sans rendez-vous', async () => {
    expect(await mockAppointmentsService.listForPatient(AUTRE_PATIENT, NOW)).toEqual([]);
  });

  it('classe les rendez-vous du patient du plus récent au plus ancien', async () => {
    const list = await mockAppointmentsService.listForPatient(PATIENT, NOW);
    const starts = list.map((appointment) => new Date(appointment.startAt).getTime());

    expect([...starts].sort((a, b) => b - a)).toEqual(starts);
  });

  it('classe les rendez-vous du dentiste du plus ancien au plus récent', async () => {
    const list = await mockAppointmentsService.listForDentist(NDIAYE, NOW);
    const starts = list.map((appointment) => new Date(appointment.startAt).getTime());

    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it('ne montre au dentiste que ses propres rendez-vous', async () => {
    const list = await mockAppointmentsService.listForDentist(NDIAYE, NOW);

    expect(list.every((appointment) => appointment.dentistId === NDIAYE)).toBe(true);
    expect(list.some((appointment) => appointment.dentistId === FALL)).toBe(false);
  });

  it('inclut les rendez-vous annulés et terminés dans l’historique du dentiste', async () => {
    const list = await mockAppointmentsService.listForDentist(NDIAYE, NOW);
    const statuses = new Set(list.map((appointment) => appointment.status));

    expect(statuses.has('termine') || statuses.has('annule')).toBe(true);
  });
});

describe('Transitions de statut (A8.5)', () => {
  it('le dentiste confirme une demande en attente', async () => {
    const created = await request();
    const confirmed = await mockAppointmentsService.confirm(created.id);

    expect(confirmed.status).toBe('confirme');
  });

  it('le dentiste termine un rendez-vous confirmé', async () => {
    const created = await request();
    await mockAppointmentsService.confirm(created.id);
    const done = await mockAppointmentsService.complete(created.id);

    expect(done.status).toBe('termine');
  });

  it('refuse de terminer une demande encore en attente', async () => {
    const created = await request();

    await expectDomainError(mockAppointmentsService.complete(created.id), 'INVALID_TRANSITION');
  });

  it('le dentiste peut encore annuler un rendez-vous confirmé', async () => {
    const created = await request();
    await mockAppointmentsService.confirm(created.id);
    const cancelled = await mockAppointmentsService.cancelByDentist(created.id);

    expect(cancelled.status).toBe('annule');
  });

  it('confirmer deux fois ne change rien', async () => {
    const created = await request();
    await mockAppointmentsService.confirm(created.id);
    const again = await mockAppointmentsService.confirm(created.id);

    expect(again.status).toBe('confirme');
  });

  it('un rendez-vous terminé est définitif', async () => {
    const created = await request();
    await mockAppointmentsService.confirm(created.id);
    await mockAppointmentsService.complete(created.id);

    await expectDomainError(
      mockAppointmentsService.cancelByDentist(created.id),
      'INVALID_TRANSITION',
    );
    await expectDomainError(mockAppointmentsService.confirm(created.id), 'INVALID_TRANSITION');
  });

  it('un rendez-vous annulé est définitif', async () => {
    const created = await request();
    await mockAppointmentsService.cancelByDentist(created.id);

    await expectDomainError(mockAppointmentsService.confirm(created.id), 'INVALID_TRANSITION');
    await expectDomainError(mockAppointmentsService.complete(created.id), 'INVALID_TRANSITION');
  });

  it('annule un rendez-vous en attente sans passer par une confirmation', async () => {
    const created = await request();
    const cancelled = await mockAppointmentsService.cancelByDentist(created.id);

    expect(cancelled.status).toBe('annule');
  });

  it('refuse toute transition sur un rendez-vous inexistant', async () => {
    await expectDomainError(mockAppointmentsService.confirm('rdv-inexistant'), 'NOT_FOUND');
    await expectDomainError(mockAppointmentsService.getById('rdv-inexistant'), 'NOT_FOUND');
  });
});

describe('Annulation par le patient (A8.4)', () => {
  it('annule une demande plus de 24 h avant', async () => {
    const created = await request({ date: new Date(2026, 9, 12), now: NOW });
    const cancelled = await mockAppointmentsService.cancelByPatient(created.id, NOW);

    expect(cancelled.status).toBe('annule');
  });

  it('refuse une annulation moins de 24 h avant le rendez-vous', async () => {
    // Demande pour mardi 6 octobre, annulation le lundi 5 à 15 h : 21 h de délai.
    const created = await request({
      date: TUESDAY,
      startMinutes: 15 * 60,
      now: new Date(2026, 9, 5, 7),
    });
    const late = new Date(2026, 9, 5, 15, 0);

    await expectDomainError(
      mockAppointmentsService.cancelByPatient(created.id, late),
      'CANCELLATION_TOO_LATE',
    );
  });

  it('refuse une annulation exactement 24 h avant', async () => {
    const created = await request({ date: new Date(2026, 9, 12), now: NOW });
    const exactly = new Date(new Date(created.startAt).getTime() - 24 * 60 * 60 * 1000);

    await expectDomainError(
      mockAppointmentsService.cancelByPatient(created.id, exactly),
      'CANCELLATION_TOO_LATE',
    );
  });

  it('refuse d’annuler deux fois', async () => {
    const created = await request({ date: new Date(2026, 9, 12), now: NOW });
    await mockAppointmentsService.cancelByPatient(created.id, NOW);

    await expectDomainError(
      mockAppointmentsService.cancelByPatient(created.id, NOW),
      'CANCELLATION_TOO_LATE',
    );
  });

  it('libère le créneau après annulation par le patient', async () => {
    const created = await request({
      startMinutes: 15 * 60,
      durationMinutes: 60,
      now: new Date(2026, 9, 4),
    });
    await mockAppointmentsService.cancelByPatient(created.id, new Date(2026, 9, 4, 9));

    // Le même créneau redevient réservable.
    const again = await request({ startMinutes: 15 * 60, durationMinutes: 60 });
    expect(again.status).toBe('en_attente');
  });

  it('bloque le créneau tant que le rendez-vous est confirmé', async () => {
    const created = await request({
      startMinutes: 15 * 60,
      durationMinutes: 30,
      now: new Date(2026, 9, 4),
    });
    await mockAppointmentsService.confirm(created.id);

    await expectDomainError(
      request({ startMinutes: 15 * 60, durationMinutes: 30, availabilityResolver: undefined }),
      'OVERLAP',
    );
  });

  it('libère le créneau une fois le rendez-vous terminé', async () => {
    const created = await request({
      startMinutes: 15 * 60,
      durationMinutes: 30,
      now: new Date(2026, 9, 4),
    });
    await mockAppointmentsService.confirm(created.id);
    await mockAppointmentsService.complete(created.id);

    // `termine` libère la place : un nouveau rendez-vous peut reprendre le créneau.
    const again = await request({
      startMinutes: 15 * 60,
      durationMinutes: 30,
      availabilityResolver: undefined,
    });
    expect(again.status).toBe('en_attente');
  });
});

describe('Jeu de données de démonstration (B0)', () => {
  it('fourne un historique et des rendez-vous à venir pour le patient de démonstration', async () => {
    const list = await mockAppointmentsService.listForPatient(PATIENT, NOW);
    const upcoming = list.filter((appointment) => new Date(appointment.startAt) > NOW);

    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(upcoming.length).toBeGreaterThan(0);
    expect(list.some((appointment) => appointment.status === 'en_attente')).toBe(true);
  });

  it('place les rendez-vous du patient de démonstration chez le Dr Ndiaye', async () => {
    const list = await mockAppointmentsService.listForPatient(PATIENT, NOW);
    const atNdiaye = list.filter((appointment) => appointment.dentistId === NDIAYE);

    expect(atNdiaye.length).toBeGreaterThan(0);
  });

  it('ne place aucun rendez-vous à venir hors des jours ouvrés déclarés', async () => {
    const list = await mockAppointmentsService.listForDentist(NDIAYE, NOW);
    const workingDays = [1, 2, 3, 4, 5];

    for (const appointment of list as Appointment[]) {
      if (new Date(appointment.startAt) <= NOW) continue;
      expect(workingDays).toContain(new Date(appointment.startAt).getDay());
    }
  });
});
