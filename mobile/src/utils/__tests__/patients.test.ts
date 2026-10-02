import type { Appointment } from '@/types/appointment';
import { SEED_PATIENTS } from '@/mocks/patients';
import { buildPatientList, filterPatients } from '@/utils/patients';

/**
 * Annuaire des patients vus par un praticien.
 *
 * Ce que l'écran « Patients » montre est entièrement décidé ici : qui est
 * listé, ce qui compte comme une consultation, et comment la recherche se
 * comporte sur les noms sénégalais.
 */

/** Lundi 5 octobre 2026, 08 h. */
const NOW = new Date(2026, 9, 5, 8, 0, 0, 0);
const TUESDAY = new Date(2026, 9, 6);

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

describe('buildPatientList — annuaire des patients suivis', () => {
  const history = [
    appointment({
      id: 'p1',
      patientId: 'u-patient-1',
      status: 'termine',
      startAt: at(new Date(2026, 8, 10), 10 * 60),
      endAt: at(new Date(2026, 8, 10), 10 * 60 + 30),
    }),
    appointment({ id: 'p2', patientId: 'u-patient-1', status: 'confirme' }),
    appointment({
      id: 'p3',
      patientId: 'u-patient-2',
      status: 'en_attente',
      startAt: at(new Date(2026, 9, 8), 9 * 60),
      endAt: at(new Date(2026, 9, 8), 9 * 60 + 30),
    }),
    appointment({
      id: 'p4',
      patientId: 'u-patient-3',
      status: 'annule',
      startAt: at(new Date(2026, 8, 12), 9 * 60),
      endAt: at(new Date(2026, 8, 12), 9 * 60 + 30),
    }),
  ];

  it('classe par nom de famille, comme un annuaire de cabinet', () => {
    expect(buildPatientList(history, SEED_PATIENTS, NOW).map((p) => p.lastName)).toEqual([
      'Diop',
      'Sène',
      'Sow',
    ]);
  });

  it('compte les consultations passées et les rendez-vous à venir', () => {
    const list = buildPatientList(history, SEED_PATIENTS, NOW);
    const diop = list.find((p) => p.id === 'u-patient-1')!;

    expect(diop.visitCount).toBe(1);
    expect(diop.upcomingCount).toBe(1);
  });

  it('donne la dernière visite et le prochain rendez-vous', () => {
    const list = buildPatientList(history, SEED_PATIENTS, NOW);
    const diop = list.find((p) => p.id === 'u-patient-1')!;

    expect(diop.lastVisitAt).toBe(at(new Date(2026, 8, 10), 10 * 60));
    expect(diop.nextVisitAt).toBe(at(TUESDAY, 10 * 60));
  });

  it('ne compte pas un rendez-vous annulé parmi les consultations', () => {
    // Ibrahima Sow n'a qu'une demande annulée : il reste listé, sans historique.
    const sow = buildPatientList(history, SEED_PATIENTS, NOW).find((p) => p.id === 'u-patient-3')!;

    expect(sow.visitCount).toBe(0);
    expect(sow.upcomingCount).toBe(0);
    expect(sow.lastVisitAt).toBeNull();
    expect(sow.nextVisitAt).toBeNull();
  });

  it('exclut un patient absent de l’annuaire', () => {
    const list = buildPatientList([appointment({ patientId: 'fantome' })], SEED_PATIENTS, NOW);

    expect(list).toEqual([]);
  });

  it('ne liste pas un patient sans rendez-vous', () => {
    expect(buildPatientList([], SEED_PATIENTS, NOW)).toEqual([]);
  });

  it('ne modifie pas la liste de rendez-vous reçue', () => {
    const input = [...history];
    buildPatientList(input, SEED_PATIENTS, NOW);

    expect(input).toHaveLength(history.length);
  });
});

describe('filterPatients — recherche', () => {
  const list = buildPatientList(
    [appointment({ patientId: 'u-patient-2' }), appointment({ patientId: 'u-patient-4' })],
    SEED_PATIENTS,
    NOW,
  );

  it('renvoie tout le monde pour une recherche vide', () => {
    expect(filterPatients(list, '   ')).toHaveLength(2);
  });

  it('retrouve par nom', () => {
    expect(filterPatients(list, 'sène').map((p) => p.id)).toEqual(['u-patient-2']);
  });

  it('ignore les accents dans la recherche', () => {
    expect(filterPatients(list, 'ndèye').map((p) => p.id)).toEqual(['u-patient-4']);
    expect(filterPatients(list, 'ndeye').map((p) => p.id)).toEqual(['u-patient-4']);
  });

  it('retrouve par téléphone', () => {
    expect(filterPatients(list, '320 41').map((p) => p.id)).toEqual(['u-patient-2']);
  });

  it('renvoie une liste vide si rien ne correspond', () => {
    expect(filterPatients(list, 'zzzz')).toEqual([]);
  });
});
