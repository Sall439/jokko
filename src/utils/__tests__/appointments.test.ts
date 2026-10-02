import {
  CANCELLATION_WINDOW_MS,
  blocksAgenda,
  canPatientCancel,
  hasOverlap,
  hoursUntilAppointment,
  overlapsInterval,
} from '@/utils/appointments';

/**
 * Règles A8.1 (chevauchement) et A8.4 (annulation jusqu'à 24 h avant).
 */

const HOUR = 60 * 60 * 1000;

/**
 * Repère de référence : lundi 5 octobre 2026 à 09:00, heure locale.
 * `at(1.5)` vaut donc 10:30 — les demi-heures restent possibles, ce que ne
 * permettait pas une heure entière formatsée en chaîne.
 */
const BASE = new Date(2026, 9, 5, 9, 0, 0, 0).getTime();

/** `hours` heures après 09:00. */
const at = (hours: number) => BASE + hours * HOUR;

/** 09:00–10:00. */
const SLOT_9H = { startMs: at(0), endMs: at(1) };

describe('overlapsInterval — intervalles semi-ouverts [début, fin[', () => {
  it('détecte un chevauchement partiel', () => {
    // 09:00–10:00 contre 09:30–11:00.
    expect(overlapsInterval(SLOT_9H, { startMs: at(0.5), endMs: at(2) })).toBe(true);
  });

  it('ne considère pas deux rendez-vous jointifs comme chevauchants', () => {
    // 09:00–10:00 puis 10:00–11:00 : le patient peut repartir à l'heure.
    expect(overlapsInterval(SLOT_9H, { startMs: at(1), endMs: at(2) })).toBe(false);
  });

  it('détecte un rendez-vous entièrement imbriqué', () => {
    expect(
      overlapsInterval({ startMs: at(0), endMs: at(3) }, { startMs: at(1), endMs: at(2) }),
    ).toBe(true);
  });

  it('ignore des rendez-vous séparés par une heure', () => {
    expect(overlapsInterval(SLOT_9H, { startMs: at(2), endMs: at(3) })).toBe(false);
  });

  it('ignore deux créneaux strictement disjoints', () => {
    expect(overlapsInterval(SLOT_9H, { startMs: at(4), endMs: at(5) })).toBe(false);
  });
});

describe('hasOverlap', () => {
  it('trouve le chevauchement parmi plusieurs rendez-vous', () => {
    const others = [
      { startMs: at(-1), endMs: at(0) },
      { startMs: at(0), endMs: at(1) },
      { startMs: at(2), endMs: at(3) },
    ];
    expect(hasOverlap(SLOT_9H, others)).toBe(true);
  });

  it('ne trouve rien si aucun rendez-vous ne correspond', () => {
    const others = [
      { startMs: at(-1), endMs: at(0) },
      { startMs: at(1), endMs: at(2) },
    ];
    expect(hasOverlap(SLOT_9H, others)).toBe(false);
  });

  it('ne trouve rien dans une liste vide', () => {
    expect(hasOverlap(SLOT_9H, [])).toBe(false);
  });
});

describe('blocksAgenda — statuts qui occupent une place', () => {
  it('en attente et confirmé occupent la place', () => {
    expect(blocksAgenda({ status: 'en_attente' })).toBe(true);
    expect(blocksAgenda({ status: 'confirme' })).toBe(true);
  });

  it('annulé et terminé libèrent la place', () => {
    expect(blocksAgenda({ status: 'annule' })).toBe(false);
    expect(blocksAgenda({ status: 'termine' })).toBe(false);
  });
});

describe('canPatientCancel — délai de 24 h (A8.4)', () => {
  const now = new Date('2026-10-05T10:00:00');
  const startAt = (hoursFromNow: number) =>
    new Date(now.getTime() + hoursFromNow * HOUR).toISOString();

  it('autorise plus de 24 h avant', () => {
    expect(canPatientCancel({ startAt: startAt(30), status: 'confirme' }, now)).toBe(true);
  });

  it('refuse exactement 24 h avant — la limite est stricte', () => {
    expect(
      canPatientCancel(
        { startAt: startAt(CANCELLATION_WINDOW_MS / HOUR), status: 'confirme' },
        now,
      ),
    ).toBe(false);
  });

  it('refuse moins de 24 h avant', () => {
    expect(canPatientCancel({ startAt: startAt(23), status: 'confirme' }, now)).toBe(false);
  });

  it('refuse un rendez-vous déjà annulé', () => {
    expect(canPatientCancel({ startAt: startAt(48), status: 'annule' }, now)).toBe(false);
  });

  it('refuse un rendez-vous terminé', () => {
    expect(canPatientCancel({ startAt: startAt(48), status: 'termine' }, now)).toBe(false);
  });

  it('compare au début du rendez-vous, pas à sa fin', () => {
    // Début dans 24 h 30 : autorisé même si la fin dépasse le délai.
    expect(canPatientCancel({ startAt: startAt(24.5), status: 'confirme' }, now)).toBe(true);
  });
});

describe('hoursUntilAppointment', () => {
  const now = new Date('2026-10-05T10:00:00');

  it('compte les heures restantes', () => {
    expect(hoursUntilAppointment(new Date(now.getTime() + 5 * HOUR).toISOString(), now)).toBe(5);
  });

  it('arrondit à l’unité supérieure', () => {
    expect(hoursUntilAppointment(new Date(now.getTime() + 5.1 * HOUR).toISOString(), now)).toBe(6);
  });

  it('donne une valeur négative pour un rendez-vous passé', () => {
    expect(hoursUntilAppointment(new Date(now.getTime() - 3 * HOUR).toISOString(), now)).toBe(-3);
  });
});
