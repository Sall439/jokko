import {
  BOOKABLE_DAYS_COUNT,
  addDays,
  firstOpenDay,
  fromDateKey,
  listOpenDays,
  toDateKey,
} from '@/utils/booking';
import { SEED_AVAILABILITY_FALL, SEED_AVAILABILITY_NDIAYE } from '@/mocks/availability';

/**
 * Sélection de date du parcours de réservation.
 *
 * Les disponibilités du Dr Ndiaye servent de calendrier de référence :
 * lundi, mardi, jeudi, vendredi et mercredi sont ouverts, samedi et dimanche
 * fermés.
 */

/** Lundi 5 octobre 2026, 09:00, heure locale. */
const MONDAY_MORNING = new Date(2026, 9, 5, 9, 0, 0, 0);

/** Les jours trouvés, sous forme de dates locales à minuit. */
const asKeys = (days: Date[]) => days.map(toDateKey);

describe('toDateKey / fromDateKey', () => {
  it('formate une date en YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 9, 5))).toBe('2026-10-05');
  });

  it('complète le mois et le jour à deux chiffres', () => {
    expect(toDateKey(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('utilise les composants locaux, pas UTC', () => {
    // 23h30 locales : en UTC selon la machine, ce serait souvent le lendemain.
    // La clé doit rester celle du jour affiché à l'écran.
    expect(toDateKey(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
    expect(toDateKey(new Date(2026, 9, 5, 0, 30))).toBe('2026-10-05');
  });

  it('fait l’aller-retour', () => {
    const date = new Date(2026, 9, 5);
    expect(toDateKey(fromDateKey(toDateKey(date)))).toBe('2026-10-05');
  });

  it('retombe sur minuit local', () => {
    const date = fromDateKey('2026-10-05');
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getDate()).toBe(5);
  });
});

describe('addDays', () => {
  it('avance d’un jour', () => {
    expect(toDateKey(addDays(new Date(2026, 9, 5), 1))).toBe('2026-10-06');
  });

  it('change de mois', () => {
    expect(toDateKey(addDays(new Date(2026, 9, 31), 1))).toBe('2026-11-01');
  });

  it('gère le passage d’année', () => {
    expect(toDateKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
  });

  it('ne conserve ni heure ni minute', () => {
    const result = addDays(new Date(2026, 9, 5, 14, 37), 3);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('accepte un décalage négatif', () => {
    expect(toDateKey(addDays(new Date(2026, 9, 5), -1))).toBe('2026-10-04');
  });
});

describe('listOpenDays', () => {
  it('saute le week-end', () => {
    const days = listOpenDays(SEED_AVAILABILITY_NDIAYE, 5, MONDAY_MORNING);

    // Lundi 5, mardi 6, mercredi 7, jeudi 8, vendredi 9 : jamais le samedi 10.
    expect(asKeys(days)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
    ]);
  });

  it('ne propose aucun samedi ni dimanche', () => {
    const days = listOpenDays(SEED_AVAILABILITY_NDIAYE, 14, MONDAY_MORNING);

    expect(days.every((day) => day.getDay() !== 0 && day.getDay() !== 6)).toBe(true);
  });

  it('respecte le nombre demandé', () => {
    expect(listOpenDays(SEED_AVAILABILITY_NDIAYE, 3, MONDAY_MORNING)).toHaveLength(3);
    expect(listOpenDays(SEED_AVAILABILITY_NDIAYE, 14, MONDAY_MORNING)).toHaveLength(14);
  });

  it('renvoie une liste vide si aucun jour n’est ouvert', () => {
    // Le Dr Fall n'a aucune disponibilité déclarée (B0) : mieux vaut une liste
    // vide que d'inventer des jours ouvrés.
    expect(listOpenDays(SEED_AVAILABILITY_FALL, 10, MONDAY_MORNING)).toEqual([]);
  });

  it('renvoie une liste vide pour un compte nul ou négatif', () => {
    expect(listOpenDays(SEED_AVAILABILITY_NDIAYE, 0, MONDAY_MORNING)).toEqual([]);
    expect(listOpenDays(SEED_AVAILABILITY_NDIAYE, -3, MONDAY_MORNING)).toEqual([]);
  });

  it('conserve le jour même s’il est ouvert', () => {
    // 09:00 un lundi : la journée n'est pas finie, la décision revient à
    // `computeSlots` qui exclut les heures déjà passées.
    expect(asKeys(listOpenDays(SEED_AVAILABILITY_NDIAYE, 1, MONDAY_MORNING))).toEqual([
      '2026-10-05',
    ]);
  });

  it('reprend le premier jour ouvert après un week-end', () => {
    const saturday = new Date(2026, 9, 10, 10, 0, 0, 0);

    expect(asKeys(listOpenDays(SEED_AVAILABILITY_NDIAYE, 1, saturday))).toEqual(['2026-10-12']);
  });

  it('utilise 14 jours par défaut', () => {
    expect(listOpenDays(SEED_AVAILABILITY_NDIAYE, undefined, MONDAY_MORNING)).toHaveLength(
      BOOKABLE_DAYS_COUNT,
    );
  });
});

describe('firstOpenDay', () => {
  it('renvoie le premier jour réservable', () => {
    expect(toDateKey(firstOpenDay(SEED_AVAILABILITY_NDIAYE, MONDAY_MORNING)!)).toBe('2026-10-05');
  });

  it('saute le week-end', () => {
    expect(toDateKey(firstOpenDay(SEED_AVAILABILITY_NDIAYE, new Date(2026, 9, 10))!)).toBe(
      '2026-10-12',
    );
  });

  it('renvoie null si rien n’est ouvert', () => {
    expect(firstOpenDay(SEED_AVAILABILITY_FALL, MONDAY_MORNING)).toBeNull();
  });
});
