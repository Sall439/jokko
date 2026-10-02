import { emptyAvailability, isValidWorkingDay } from '@/types/availability';
import type { WeeklyAvailability } from '@/types/availability';
import {
  addBreak,
  problemForDay,
  removeBreak,
  setBreak,
  setDayHours,
  summarizeWeek,
  toggleDay,
  validateAvailability,
} from '@/utils/availability-draft';

/**
 * Éditeur de disponibilités : fonctions pures testées sans rendu (A8.2).
 *
 * Les tests passent uniquement par l'API publique — ce que l'écran appelle
 * vraiment — et vérifient le résultat en termes de validité métier
 * (`isValidWorkingDay`), pas en internals.
 *
 * Le point critique est la validation : une plage incohérente enregistrée
 * ouvrirait aux patients des créneaux que le praticien n'a pas déclarés.
 */

function week(): WeeklyAvailability {
  return {
    0: {
      weekday: 0,
      startMinutes: 540,
      endMinutes: 1020,
      breaks: [{ startMinutes: 780, endMinutes: 840 }],
    },
    1: null,
    2: { weekday: 2, startMinutes: 540, endMinutes: 1020, breaks: [] },
    3: null,
    4: null,
    5: null,
    6: null,
  };
}

describe('toggleDay — ouverture et fermeture', () => {
  it('ouvre un jour fermé avec la plage proposée', () => {
    const opened = toggleDay(week(), 1);

    expect(opened[1]).not.toBeNull();
    expect(opened[1]?.startMinutes).toBe(9 * 60);
    expect(opened[1]?.endMinutes).toBe(17 * 60);
  });

  it('ferme un jour ouvert sans toucher aux autres', () => {
    const closed = toggleDay(week(), 0);

    expect(closed[0]).toBeNull();
    expect(closed[2]).not.toBeNull();
  });

  it('fait l’aller-retour', () => {
    expect(toggleDay(toggleDay(week(), 1), 1)[1]).toBeNull();
  });

  it('ouvre un jour avec une plage valide', () => {
    const opened = toggleDay(week(), 1);

    expect(isValidWorkingDay(opened[1]!)).toBe(true);
  });

  it('ne modifie pas la semaine reçue', () => {
    const original = week();
    toggleDay(original, 1);

    expect(original[1]).toBeNull();
  });
});

describe('setDayHours — plage de travail', () => {
  it('remplace les bornes', () => {
    const next = setDayHours(week(), 0, 8 * 60, 18 * 60);

    expect(next[0]?.startMinutes).toBe(8 * 60);
    expect(next[0]?.endMinutes).toBe(18 * 60);
  });

  it('arrondit la saisie au pas de 15 minutes', () => {
    const next = setDayHours(week(), 0, 8 * 60 + 7, 18 * 60 + 4);

    expect(next[0]?.startMinutes).toBe(8 * 60);
    expect(next[0]?.endMinutes).toBe(18 * 60);
  });

  it('ignore la modification d’un jour fermé', () => {
    const original = week();

    expect(setDayHours(original, 1, 600, 700)).toBe(original);
  });
});

describe('Pauses', () => {
  it('ajoute une pause sans chevaucher une pause existante', () => {
    const next = addBreak(week(), 0);
    const pauses = next[0]!.breaks;

    expect(pauses).toHaveLength(2);

    for (const [index, first] of pauses.entries()) {
      for (const second of pauses.slice(index + 1)) {
        const overlaps =
          first.startMinutes < second.endMinutes && second.startMinutes < first.endMinutes;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('ajoute une pause dans la plage, donc laisse la journée valide', () => {
    expect(isValidWorkingDay(addBreak(week(), 0)[0]!)).toBe(true);
  });

  it('supprime la pause d’indice donné', () => {
    expect(removeBreak(week(), 0, 0)[0]?.breaks).toHaveLength(0);
  });

  it('ignore un indice hors bornes', () => {
    const original = week();

    expect(removeBreak(original, 0, 5)).toBe(original);
    expect(removeBreak(original, 0, -1)).toBe(original);
  });

  it('remplace les bornes d’une pause', () => {
    expect(setBreak(week(), 0, 0, 12 * 60, 13 * 60)[0]?.breaks[0]).toEqual({
      startMinutes: 720,
      endMinutes: 780,
    });
  });
});

describe('validateAvailability — points de vigilance', () => {
  it('accepte une semaine cohérente', () => {
    expect(validateAvailability(week())).toEqual([]);
  });

  it('refuse une plage inversée', () => {
    const problems = validateAvailability(setDayHours(week(), 0, 18 * 60, 9 * 60));

    expect(problems).toHaveLength(1);
    expect(problems[0].weekday).toBe(0);
  });

  it('refuse une pause hors de la plage', () => {
    const problems = validateAvailability(setBreak(week(), 0, 0, 16 * 60, 18 * 60));

    expect(problems).toHaveLength(1);
    expect(problemForDay(problems, 0)).not.toBeNull();
  });

  it('refuse une semaine entièrement fermée', () => {
    const problems = validateAvailability(emptyAvailability());

    expect(problems).toHaveLength(1);
    expect(problems[0].weekday).toBeNull();
  });

  it('rattache chaque message à son jour', () => {
    const problems = validateAvailability(setDayHours(week(), 2, 17 * 60, 9 * 60));

    expect(problemForDay(problems, 2)).not.toBeNull();
    expect(problemForDay(problems, 0)).toBeNull();
  });

  it('signale chaque jour fautif, pas seulement le premier', () => {
    const broken = setDayHours(setDayHours(week(), 0, 18 * 60, 9 * 60), 2, 18 * 60, 9 * 60);

    expect(validateAvailability(broken)).toHaveLength(2);
  });
});

describe('summarizeWeek — résumé de la semaine', () => {
  it('compte les jours ouverts', () => {
    expect(summarizeWeek(week())).toBe('2 jours ouverts sur 7');
    expect(summarizeWeek(toggleDay(week(), 3))).toBe('3 jours ouverts sur 7');
  });

  it('accuse réception d’une semaine vide', () => {
    expect(summarizeWeek(emptyAvailability())).toBe('Aucun jour ouvert');
  });
});
