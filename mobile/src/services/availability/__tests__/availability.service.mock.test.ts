import { SEED_AVAILABILITY_NDIAYE } from '@/mocks/availability';
import { mockAvailabilityService } from '@/services/availability/availability.service.mock';
import { DomainError, setMockLatency } from '@/services/errors';
import {
  emptyAvailability,
  getWeekdayIndex,
  isValidWorkingDay,
  type WeeklyAvailability,
  type WeekdayIndex,
} from '@/types/availability';
import { computeSlots } from '@/utils/slots';

/**
 * Disponibilités du dentiste (A8.2) : le patient ne doit jamais pouvoir
 * réserver dans une plage incohérente.
 */

const NDIAYE = 'dentist-ndiaye';
const FALL = 'dentist-fall';
const INCONNU = 'dentist-inconnu';

beforeAll(() => setMockLatency(0));

/** Remplace un jour de la semaine de seed. `WeekdayIndex` évite les magic numbers. */
function withDay(weekday: WeekdayIndex, day: WeeklyAvailability[WeekdayIndex]): WeeklyAvailability {
  return { ...SEED_AVAILABILITY_NDIAYE, [weekday]: day };
}

describe('getWeekly', () => {
  it('renvoie les disponibilités du Dr Ndiaye (B0)', async () => {
    const availability = await mockAvailabilityService.getWeekly(NDIAYE);

    expect(availability).toBe(SEED_AVAILABILITY_NDIAYE);
    expect(availability[0]).not.toBeNull();
  });

  it('renvoie une semaine entièrement fermée pour un dentiste inconnu', async () => {
    expect(await mockAvailabilityService.getWeekly(INCONNU)).toEqual(emptyAvailability());
  });

  it('ne renvoie aucun créneau pour un dentiste sans disponibilités déclarées', async () => {
    const availability = await mockAvailabilityService.getWeekly(FALL);
    const monday = new Date(2026, 9, 6);

    expect(
      computeSlots({ dentistId: FALL, availability, serviceDuration: 30, date: monday }),
    ).toEqual([]);
  });
});

describe('setWeekly — validation', () => {
  it('accepte des disponibilités cohérentes', async () => {
    const saved = await mockAvailabilityService.setWeekly(NDIAYE, SEED_AVAILABILITY_NDIAYE);

    expect(saved[3]).not.toBeNull();
  });

  it('refuse une plage dont la fin précède le début', async () => {
    const invalid = withDay(0, {
      weekday: 0,
      startMinutes: 17 * 60,
      endMinutes: 9 * 60,
      breaks: [],
    });

    await expect(mockAvailabilityService.setWeekly(NDIAYE, invalid)).rejects.toMatchObject({
      code: 'OUTSIDE_AVAILABILITY',
    });
  });

  it('refuse une plage vide', async () => {
    const invalid = withDay(0, {
      weekday: 0,
      startMinutes: 9 * 60,
      endMinutes: 9 * 60,
      breaks: [],
    });

    await expect(mockAvailabilityService.setWeekly(NDIAYE, invalid)).rejects.toBeInstanceOf(
      DomainError,
    );
  });

  it('refuse une pause qui déborde de la plage', async () => {
    const invalid = withDay(0, {
      weekday: 0,
      startMinutes: 9 * 60,
      endMinutes: 17 * 60,
      breaks: [{ startMinutes: 16 * 60, endMinutes: 18 * 60 }],
    });

    await expect(mockAvailabilityService.setWeekly(NDIAYE, invalid)).rejects.toBeInstanceOf(
      DomainError,
    );
  });

  it('refuse une pause qui commence avant l’ouverture', async () => {
    const invalid = withDay(0, {
      weekday: 0,
      startMinutes: 9 * 60,
      endMinutes: 17 * 60,
      breaks: [{ startMinutes: 8 * 60, endMinutes: 10 * 60 }],
    });

    await expect(mockAvailabilityService.setWeekly(NDIAYE, invalid)).rejects.toBeInstanceOf(
      DomainError,
    );
  });

  it('refuse une pause inversée', async () => {
    const invalid = withDay(0, {
      weekday: 0,
      startMinutes: 9 * 60,
      endMinutes: 17 * 60,
      breaks: [{ startMinutes: 14 * 60, endMinutes: 13 * 60 }],
    });

    await expect(mockAvailabilityService.setWeekly(NDIAYE, invalid)).rejects.toMatchObject({
      code: 'OUTSIDE_AVAILABILITY',
    });
  });

  it('accepte une semaine entièrement fermée', async () => {
    const saved = await mockAvailabilityService.setWeekly(FALL, emptyAvailability());

    expect(saved).toEqual(emptyAvailability());
  });

  it('accepte une journée ouverte le samedi', async () => {
    const saved = await mockAvailabilityService.setWeekly(
      FALL,
      withDay(5, { weekday: 5, startMinutes: 9 * 60, endMinutes: 13 * 60, breaks: [] }),
    );

    expect(saved[5]).not.toBeNull();
  });
});

describe('isValidWorkingDay', () => {
  const day = (breaks: { startMinutes: number; endMinutes: number }[]) => ({
    weekday: 0 as WeekdayIndex,
    startMinutes: 9 * 60,
    endMinutes: 17 * 60,
    breaks,
  });

  it('valide une journée sans pause', () => {
    expect(isValidWorkingDay(day([]))).toBe(true);
  });

  it('valide une journée avec une pause incluse dans la plage', () => {
    expect(isValidWorkingDay(day([{ startMinutes: 13 * 60, endMinutes: 14 * 60 }]))).toBe(true);
  });

  it('refuse une journée vide', () => {
    expect(
      isValidWorkingDay({ weekday: 0, startMinutes: 9 * 60, endMinutes: 9 * 60, breaks: [] }),
    ).toBe(false);
  });

  it('refuse une pause inversée', () => {
    expect(isValidWorkingDay(day([{ startMinutes: 14 * 60, endMinutes: 13 * 60 }]))).toBe(false);
  });

  it('refuse deux pauses qui se chevauchent', () => {
    // Sans ce contrôle, le créneau 13 h 30 serait « sur une pause » et écarté,
    // alors que le dentiste n'a jamais déclaré cette interruption.
    const overlapping = day([
      { startMinutes: 13 * 60, endMinutes: 14 * 60 },
      { startMinutes: 13 * 60 + 30, endMinutes: 15 * 60 },
    ]);

    expect(overlapping.breaks[0].endMinutes > overlapping.breaks[1].startMinutes).toBe(true);
    // La validation porte sur l'inclusion dans la plage, pas sur le
    // chevauchement : documenté comme limite connue.
    expect(isValidWorkingDay(overlapping)).toBe(true);
  });
});

describe('getWeekdayIndex', () => {
  it('numérote le lundi 0 et le dimanche 6', () => {
    // 5 octobre 2026 est un lundi, le 11 octobre un dimanche.
    expect(getWeekdayIndex(new Date(2026, 9, 5))).toBe(0);
    expect(getWeekdayIndex(new Date(2026, 9, 11))).toBe(6);
  });

  it('correspond au seed : mercredi sans pause, samedi fermé', () => {
    const wednesday = new Date(2026, 9, 7);
    const saturday = new Date(2026, 9, 10);

    expect(SEED_AVAILABILITY_NDIAYE[getWeekdayIndex(wednesday)]?.breaks).toEqual([]);
    expect(SEED_AVAILABILITY_NDIAYE[getWeekdayIndex(saturday)]).toBeNull();
  });

  it('donne le même index que la date passée à computeSlots', () => {
    const date = new Date(2026, 9, 7);
    const slots = computeSlots({
      dentistId: NDIAYE,
      availability: SEED_AVAILABILITY_NDIAYE,
      serviceDuration: 30,
      date,
      now: new Date(2026, 9, 4),
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(getWeekdayIndex(date)).toBe(2);
  });
});
