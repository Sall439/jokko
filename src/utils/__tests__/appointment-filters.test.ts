import {
  APPOINTMENT_FILTERS,
  countByFilter,
  countUpcoming,
  filterAppointments,
  isUpcoming,
  sortAppointments,
  summarizePatientActivity,
  type AppointmentFilterId,
} from '@/utils/appointments';
import type { Appointment, AppointmentStatus } from '@/types/appointment';

/**
 * Listes, tri et filtres de « Mes rendez-vous » côté patient.
 */

/** Lundi 5 octobre 2026 à 09:00, heure locale. */
const NOW = new Date(2026, 9, 5, 9, 0, 0, 0);
const HOUR = 60 * 60 * 1000;

let counter = 0;

/** Rendez-vous de test : `hours` par rapport à `NOW`, statut et durée imposés. */
function appointment(hours: number, status: AppointmentStatus, durationHours = 1): Appointment {
  const startMs = NOW.getTime() + hours * HOUR;
  counter += 1;

  return {
    id: `rdv-${counter}`,
    patientId: 'patient-moussa',
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-detartrage',
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(startMs + durationHours * HOUR).toISOString(),
    status,
    createdAt: new Date(startMs - 5 * HOUR).toISOString(),
    updatedAt: new Date(startMs - 5 * HOUR).toISOString(),
  };
}

describe('isUpcoming', () => {
  it('compte un rendez-vous en attente dans le futur', () => {
    expect(isUpcoming(appointment(24, 'en_attente'), NOW)).toBe(true);
  });

  it('compte un rendez-vous confirmé dans le futur', () => {
    expect(isUpcoming(appointment(24, 'confirme'), NOW)).toBe(true);
  });

  it('exclut un rendez-vous terminé mêmeplacedans le futur', () => {
    // Anomalie de données : un rendez-vous clôturé reste dans l'historique.
    expect(isUpcoming(appointment(24, 'termine'), NOW)).toBe(false);
  });

  it('exclut un rendez-vous annulé même placé dans le futur', () => {
    expect(isUpcoming(appointment(24, 'annule'), NOW)).toBe(false);
  });

  it('exclut un rendez-vous passé, quel que soit son statut', () => {
    expect(isUpcoming(appointment(-3, 'en_attente'), NOW)).toBe(false);
    expect(isUpcoming(appointment(-3, 'confirme'), NOW)).toBe(false);
  });

  it('considère un rendez-vous commençant exactement maintenant comme passé', () => {
    expect(isUpcoming(appointment(0, 'confirme'), NOW)).toBe(false);
  });
});

describe('sortAppointments', () => {
  const past = appointment(-48, 'termine');
  const next = appointment(2, 'confirme');
  const later = appointment(72, 'en_attente');

  it('met les rendez-vous à venir en premier, du plus proche au plus lointain', () => {
    const sorted = sortAppointments([later, next, past], NOW);
    expect(sorted.map((item) => item.id)).toEqual([next.id, later.id, past.id]);
  });

  it('place le passé après le futur, du plus récent au plus ancien', () => {
    const older = appointment(-240, 'termine');
    const sorted = sortAppointments([older, past, next], NOW);

    expect(sorted.map((item) => item.id)).toEqual([next.id, past.id, older.id]);
  });

  it('ne modifie pas la liste d’origine', () => {
    const source = [later, next, past];
    sortAppointments(source, NOW);
    expect(source.map((item) => item.id)).toEqual([later.id, next.id, past.id]);
  });

  it('laisse une liste vide inchangée', () => {
    expect(sortAppointments([], NOW)).toEqual([]);
  });

  it('conserve l’ordre à stables pour deux rendez-vous simultanés', () => {
    const a = appointment(2, 'confirme');
    const b = appointment(2, 'en_attente');
    const sorted = sortAppointments([a, b], NOW);

    expect(sorted.map((item) => item.id)).toEqual([a.id, b.id]);
  });
});

describe('filterAppointments', () => {
  const upcoming = appointment(24, 'confirme');
  const pending = appointment(48, 'en_attente');
  const done = appointment(-24, 'termine');
  const cancelled = appointment(-48, 'annule');
  const all = [upcoming, pending, done, cancelled];

  it('« Tous » ne retire rien', () => {
    expect(filterAppointments(all, 'tous', NOW)).toHaveLength(4);
  });

  it('« En attente » ne garde que les demandes non confirmées', () => {
    expect(filterAppointments(all, 'en_attente', NOW).map((a) => a.id)).toEqual([pending.id]);
  });

  it('« Confirmés » ne garde que les rendez-vous validés', () => {
    expect(filterAppointments(all, 'confirme', NOW).map((a) => a.id)).toEqual([upcoming.id]);
  });

  it('« Historique » regroupe passés, terminés et annulés', () => {
    expect(filterAppointments(all, 'historique', NOW).map((a) => a.id)).toEqual([
      done.id,
      cancelled.id,
    ]);
  });

  it('ne confond pas statut et échéance : un annulé futur reste dans l’historique', () => {
    const cancelledInAdvance = appointment(24, 'annule');
    const filtered = filterAppointments([cancelledInAdvance], 'historique', NOW);

    expect(filtered.map((a) => a.id)).toEqual([cancelledInAdvance.id]);
  });

  it('renvoie une liste vide si rien ne correspond', () => {
    expect(filterAppointments([], 'tous', NOW)).toEqual([]);
    expect(filterAppointments(all, 'en_attente', NOW)).not.toHaveLength(0);
  });

  it('conserve l’ordre reçu', () => {
    expect(filterAppointments(all, 'tous', NOW).map((a) => a.id)).toEqual(all.map((a) => a.id));
  });
});

describe('countByFilter', () => {
  const upcoming = appointment(24, 'confirme');
  const pending = appointment(48, 'en_attente');
  const done = appointment(-24, 'termine');
  const all = [upcoming, pending, done];

  it('compte chaque filtre', () => {
    expect(countByFilter(all, NOW)).toEqual({
      tous: 3,
      en_attente: 1,
      confirme: 1,
      historique: 1,
    });
  });

  it('renvoie des compteurs à zéro sur une liste vide', () => {
    expect(countByFilter([], NOW)).toEqual({
      tous: 0,
      en_attente: 0,
      confirme: 0,
      historique: 0,
    });
  });

  it('expose une entrée pour chaque filtre déclaré', () => {
    const counts = countByFilter(all, NOW);

    expect(APPOINTMENT_FILTERS.map((item) => item.id)).toEqual([
      'tous',
      'en_attente',
      'confirme',
      'historique',
    ] satisfies AppointmentFilterId[]);
    APPOINTMENT_FILTERS.forEach((item) => {
      expect(typeof counts[item.id]).toBe('number');
    });
  });
});

describe('countUpcoming', () => {
  it('compte uniquement ce qui reste à venir et non clôturé', () => {
    const list = [
      appointment(24, 'confirme'),
      appointment(48, 'en_attente'),
      appointment(-24, 'termine'),
      appointment(72, 'annule'),
    ];

    expect(countUpcoming(list, NOW)).toBe(2);
  });

  it('vaut zéro sur une liste vide', () => {
    expect(countUpcoming([], NOW)).toBe(0);
  });
});

describe('summarizePatientActivity — compteurs de « Mon compte »', () => {
  it('sépare les rendez-vous programmés des consultations faites', () => {
    const list = [
      appointment(24, 'confirme'),
      appointment(48, 'en_attente'),
      appointment(-24, 'termine'),
      appointment(-48, 'termine'),
    ];

    expect(summarizePatientActivity(list, NOW)).toEqual({ upcoming: 2, completed: 2 });
  });

  it('ne compte pas un rendez-vous annulé parmi les consultations', () => {
    const list = [appointment(-24, 'annule'), appointment(24, 'confirme')];

    expect(summarizePatientActivity(list, NOW)).toEqual({ upcoming: 1, completed: 0 });
  });

  it('ne compte pas une consultation future dans les consultations faites', () => {
    // Anomalie de données : un rendez-vous clôturé à l'avance reste clôturé,
    // mais il ne doit pas gonfler le nombre de consultations déjà faites.
    expect(summarizePatientActivity([appointment(24, 'termine')], NOW)).toEqual({
      upcoming: 0,
      completed: 1,
    });
  });

  it('renvoie deux compteurs à zéro sur une liste vide', () => {
    expect(summarizePatientActivity([], NOW)).toEqual({ upcoming: 0, completed: 0 });
  });
});
