import { SEED_AVAILABILITY_FALL, SEED_AVAILABILITY_NDIAYE } from '@/mocks/availability';
import type { Appointment } from '@/types/appointment';
import { emptyAvailability, type WeeklyAvailability } from '@/types/availability';
import { availableSlots, computeSlots, isSlotAvailable } from '@/utils/slots';
import { minutesToLabel } from '@/utils/time';

/**
 * Règle A8.7 : `computeSlots` est une fonction pure.
 * Cas couverts : pause, chevauchement, créneau passé, plage fermée, durée du
 * soin, pas de 30 minutes.
 */

/** Lundi 5 octobre 2026 — jour ouvré du Dr Ndiaye (9 h – 17 h, pause 13 h – 14 h). */
const MONDAY = new Date(2026, 9, 5);
const DENTIST = 'dentist-ndiaye';

const base = {
  dentistId: DENTIST,
  availability: SEED_AVAILABILITY_NDIAYE,
  serviceDuration: 30,
  date: MONDAY,
};

/** Rendez-vous d'une heure, construit le lundi à l'heure demandée. */
function appointmentAt(
  startMinutes: number,
  durationMinutes: number,
  overrides: Partial<Appointment> = {},
): Appointment {
  const start = new Date(MONDAY);
  start.setHours(0, startMinutes, 0, 0);
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + durationMinutes);

  return {
    id: `rdv-test-${startMinutes}`,
    patientId: 'u-patient-1',
    dentistId: DENTIST,
    serviceId: 'service-consultation',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    status: 'confirme',
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
    ...overrides,
  };
}

/** Avant le début de la journée : aucun créneau n'est « dans le passé ». */
const BEFORE_DAY = new Date(2026, 9, 4, 8, 0);

describe('computeSlots — structure de la grille', () => {
  it('propose des créneaux de 30 minutes de 9 h à 17 h', () => {
    const slots = computeSlots({ ...base, now: BEFORE_DAY });

    expect(slots[0].startMinutes).toBe(9 * 60);
    expect(slots[slots.length - 1].startMinutes).toBe(16 * 60 + 30);
    expect(slots).toHaveLength(16);
    expect(slots.every((slot) => slot.endMinutes - slot.startMinutes === 30)).toBe(true);
  });

  it('aligne les débuts sur le pas de 30 minutes', () => {
    const slots = computeSlots({ ...base, now: BEFORE_DAY });
    const starts = slots.map((slot) => slot.startMinutes);

    for (const start of starts) {
      expect(start % 30).toBe(0);
    }
  });

  it('respecte un pas personnalisé', () => {
    const slots = computeSlots({ ...base, now: BEFORE_DAY, slotStepMinutes: 60 });
    expect(slots).toHaveLength(8);
  });

  it('respecte la durée du soin pour calculer la fin (A8.3)', () => {
    const slots = computeSlots({ ...base, serviceDuration: 60, now: BEFORE_DAY });

    expect(slots.every((slot) => slot.endMinutes - slot.startMinutes === 60)).toBe(true);
    // 16 h + 60 min dépasse 17 h : le dernier créneau est écarté.
    expect(slots[slots.length - 1].startMinutes).toBe(16 * 60);
    expect(slots).toHaveLength(15);
  });

  it('renvoie une liste vide pour un jour fermé', () => {
    const saturday = new Date(2026, 9, 10);
    expect(computeSlots({ ...base, date: saturday, now: BEFORE_DAY })).toEqual([]);
  });

  it('renvoie une liste vide si aucune disponibilité n’est déclarée', () => {
    const slots = computeSlots({
      ...base,
      availability: SEED_AVAILABILITY_FALL,
      now: BEFORE_DAY,
    });
    expect(slots).toEqual([]);
  });

  it('renvoie une liste vide pour une durée ou un pas nul', () => {
    expect(computeSlots({ ...base, serviceDuration: 0, now: BEFORE_DAY })).toEqual([]);
    expect(computeSlots({ ...base, slotStepMinutes: 0, now: BEFORE_DAY })).toEqual([]);
  });
});

describe('computeSlots — pause (A8.2)', () => {
  it('marque la pause 13 h – 14 h comme fermée', () => {
    const slots = computeSlots({ ...base, now: BEFORE_DAY });
    const lunch = slots.filter(
      (slot) => slot.startMinutes >= 13 * 60 && slot.startMinutes < 14 * 60,
    );

    expect(lunch.length).toBeGreaterThan(0);
    expect(lunch.every((slot) => slot.disabled)).toBe(true);
    expect(lunch.every((slot) => slot.availability === 'closed')).toBe(true);
  });

  it('un soin de 45 min ne peut pas déborder sur la pause', () => {
    const slots = computeSlots({ ...base, serviceDuration: 45, now: BEFORE_DAY });

    // 12 h 00 + 45 min = 12 h 45 : finit avant la pause, donc disponible.
    expect(slots.find((slot) => slot.startMinutes === 12 * 60)?.availability).toBe('libre');

    // 12 h 30 + 45 min = 13 h 15 : empiète sur la pause, donc indisponible.
    const overflowing = slots.find((slot) => slot.startMinutes === 12 * 60 + 30);
    expect(overflowing?.disabled).toBe(true);
    expect(
      availableSlots({ ...base, serviceDuration: 45, now: BEFORE_DAY }).some(
        (s) => s.startMinutes === 12 * 60 + 30,
      ),
    ).toBe(false);
  });

  it('respecte une pause ponctuelle supplémentaire', () => {
    const breakStart = new Date(MONDAY);
    breakStart.setHours(10, 0, 0, 0);
    const breakEnd = new Date(MONDAY);
    breakEnd.setHours(10, 30, 0, 0);

    const slots = computeSlots({
      ...base,
      breaks: [{ startAt: breakStart.toISOString(), endAt: breakEnd.toISOString() }],
      now: BEFORE_DAY,
    });

    expect(slots.find((slot) => slot.startMinutes === 10 * 60)?.disabled).toBe(true);
  });
});

describe('computeSlots — chevauchement (A8.1)', () => {
  it('marque comme occupés les créneaux d’un rendez-vous en attente', () => {
    const slots = computeSlots({
      ...base,
      appointments: [appointmentAt(14 * 60, 45, { status: 'en_attente' })],
      now: BEFORE_DAY,
    });

    // Le rendez-vous occupe 14 h 00 – 14 h 45 : les créneaux 14 h 00 et 14 h 30
    // tombent dedans. 15 h 00 commence après 14 h 45 et reste donc libre.
    expect(slots.find((s) => s.startMinutes === 14 * 60)?.availability).toBe('occupied');
    expect(slots.find((s) => s.startMinutes === 14 * 60 + 30)?.availability).toBe('occupied');
    expect(slots.find((s) => s.startMinutes === 15 * 60)?.availability).toBe('libre');
  });

  it('ne bloque pas sur un rendez-vous annulé', () => {
    const slots = computeSlots({
      ...base,
      appointments: [appointmentAt(14 * 60, 45, { status: 'annule' })],
      now: BEFORE_DAY,
    });

    expect(slots.find((s) => s.startMinutes === 14 * 60)?.availability).toBe('libre');
  });

  it('ne bloque pas sur un rendez-vous terminé', () => {
    const slots = computeSlots({
      ...base,
      appointments: [appointmentAt(14 * 60, 45, { status: 'termine' })],
      now: BEFORE_DAY,
    });

    expect(slots.find((s) => s.startMinutes === 14 * 60)?.availability).toBe('libre');
  });

  it('ignore les rendez-vous d’un autre dentiste', () => {
    const slots = computeSlots({
      ...base,
      appointments: [appointmentAt(14 * 60, 45, { dentistId: 'dentist-fall' })],
      now: BEFORE_DAY,
    });

    expect(slots.find((s) => s.startMinutes === 14 * 60)?.availability).toBe('libre');
  });

  it('ignore les rendez-vous d’un autre jour', () => {
    const other = appointmentAt(14 * 60, 45);
    const tuesday = new Date(2026, 9, 6);

    const slots = computeSlots({ ...base, appointments: [other], date: tuesday, now: BEFORE_DAY });
    expect(slots.find((s) => s.startMinutes === 14 * 60)?.availability).toBe('libre');
  });

  it('libère le créneau jointif : un RDV finit à 14 h 45, 15 h reste libre', () => {
    const slots = computeSlots({
      ...base,
      appointments: [appointmentAt(14 * 60, 45)],
      now: BEFORE_DAY,
    });

    expect(slots.find((s) => s.startMinutes === 15 * 60)?.disabled).toBe(false);
  });
});

describe('computeSlots — créneaux passés (A8.2)', () => {
  it('marque comme passés les créneaux du matin quand il est déjà 14 h', () => {
    const slots = computeSlots({ ...base, now: new Date(2026, 9, 5, 14, 0) });

    expect(slots.find((s) => s.startMinutes === 9 * 60)?.availability).toBe('past');
    expect(slots.find((s) => s.startMinutes === 11 * 60 + 30)?.availability).toBe('past');
  });

  it('laisse libres les créneaux du jour même encore à venir', () => {
    const slots = computeSlots({ ...base, now: new Date(2026, 9, 5, 14, 0) });

    expect(slots.find((s) => s.startMinutes === 14 * 60)?.availability).toBe('libre');
    expect(slots.find((s) => s.startMinutes === 15 * 60)?.availability).toBe('libre');
  });

  it('ne marque rien comme passé pour un jour à venir', () => {
    const tuesday = new Date(2026, 9, 6);
    const slots = computeSlots({ ...base, date: tuesday, now: new Date(2026, 9, 5, 16, 0) });

    expect(slots.some((slot) => slot.availability === 'past')).toBe(false);
  });

  it('conserve la priorité de « occupé » sur « passé »', () => {
    const slots = computeSlots({
      ...base,
      appointments: [appointmentAt(9 * 60, 30)],
      now: new Date(2026, 9, 5, 14, 0),
    });

    expect(slots.find((s) => s.startMinutes === 9 * 60)?.availability).toBe('occupied');
  });
});

describe('computeSlots — mercredi sans pause (B0)', () => {
  it('s’arrête à 13 h et ne propose aucun créneau l’après-midi', () => {
    const wednesday = new Date(2026, 9, 7);
    const slots = computeSlots({ ...base, date: wednesday, now: BEFORE_DAY });

    expect(slots[0].startMinutes).toBe(9 * 60);
    expect(slots[slots.length - 1].endMinutes).toBe(13 * 60);
    expect(slots.some((slot) => slot.startMinutes > 13 * 60)).toBe(false);
  });
});

describe('availableSlots et isSlotAvailable', () => {
  const now = BEFORE_DAY;

  it('ne renvoie que les créneaux libres', () => {
    const slots = availableSlots({
      ...base,
      appointments: [appointmentAt(14 * 60, 30)],
      now,
    });

    expect(slots.every((slot) => !slot.disabled)).toBe(true);
    expect(slots.some((slot) => slot.startMinutes === 14 * 60)).toBe(false);
  });

  it('confirme la disponibilité d’un créneau précis', () => {
    const input = { ...base, appointments: [appointmentAt(14 * 60, 30)], now };

    expect(isSlotAvailable(input, 14 * 60)).toBe(false);
    expect(isSlotAvailable(input, 15 * 60)).toBe(true);
    expect(isSlotAvailable(input, 23 * 60)).toBe(false);
  });
});

describe('computeSlots — entrées non mutées', () => {
  it('ne modifie pas les disponibilités reçues', () => {
    const availability: WeeklyAvailability = { ...SEED_AVAILABILITY_NDIAYE };
    const snapshot = JSON.stringify(availability);

    computeSlots({ ...base, availability, now: BEFORE_DAY });

    expect(JSON.stringify(availability)).toBe(snapshot);
  });

  it('fonctionne avec une semaine entièrement fermée', () => {
    const slots = computeSlots({ ...base, availability: emptyAvailability(), now: BEFORE_DAY });
    expect(slots).toEqual([]);
  });
});

describe('minutesToLabel', () => {
  it('formate les minutes en heure lisible', () => {
    expect(minutesToLabel(9 * 60)).toBe('09:00');
    expect(minutesToLabel(13 * 60 + 30)).toBe('13:30');
    expect(minutesToLabel(0)).toBe('00:00');
  });
});
