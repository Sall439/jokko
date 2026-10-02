import { __resetAppointments } from '@/services/appointments/appointments.service.mock';
import { mockPatientsService } from '@/services/patients/patients.service.mock';
import { SEED_PATIENTS } from '@/mocks/patients';
import { DomainError, setMockLatency } from '@/services/errors';

/**
 * Annuaire des patients vus par un praticien.
 *
 * La règle vérifiée ici est la visibilité (A8.6) : la liste d'un praticien ne
 * doit jamais contenir un patient qui n'a rendez-vous qu'avec un collègue.
 */

/** Lundi 5 octobre 2026, 08 h. */
const NOW = new Date(2026, 9, 5, 8, 0, 0, 0);
const NDIAYE = 'dentist-ndiaye';
const FALL = 'dentist-fall';

beforeAll(() => setMockLatency(0));
beforeEach(() => __resetAppointments(NOW));

describe('list — annuaire du cabinet', () => {
  it('renvoie tous les patients enregistrés', async () => {
    expect(await mockPatientsService.list()).toEqual(SEED_PATIENTS);
  });
});

describe('getById', () => {
  it('renvoie le patient demandé', async () => {
    const patient = await mockPatientsService.getById('u-patient-2');

    expect(patient.lastName).toBe('Sène');
  });

  it('refuse un identifiant inconnu', async () => {
    await expect(mockPatientsService.getById('inconnu')).rejects.toBeInstanceOf(DomainError);
  });
});

describe('listForDentist — visibilité (A8.6)', () => {
  it('renvoie les patients ayant un rendez-vous avec ce praticien', async () => {
    const list = await mockPatientsService.listForDentist(NDIAYE, NOW);

    expect(list.length).toBeGreaterThan(0);
    expect(list.map((p) => p.id)).toContain('u-patient-1');
  });

  it('expose le téléphone, nécessaire pour joindre le patient', async () => {
    const list = await mockPatientsService.listForDentist(NDIAYE, NOW);
    const Moussa = list.find((p) => p.id === 'u-patient-1');

    expect(Moussa?.phone).toBe('+221 77 452 89 10');
  });

  it('ne renvoie que les patients du praticien, jamais ceux d’un collègue', async () => {
    const [forNdiaye, forFall] = await Promise.all([
      mockPatientsService.listForDentist(NDIAYE, NOW),
      mockPatientsService.listForDentist(FALL, NOW),
    ]);

    // Le rendez-vous d'urgence des seeds appartient au Dr Fall.
    expect(forFall.length).toBeGreaterThan(0);
    expect(forNdiaye.map((p) => p.id)).not.toEqual(forFall.map((p) => p.id));
  });

  it('renvoie une liste vide pour un praticien inconnu', async () => {
    expect(await mockPatientsService.listForDentist('dentist-inconnu', NOW)).toEqual([]);
  });

  it('trie par nom de famille', async () => {
    const list = await mockPatientsService.listForDentist(NDIAYE, NOW);
    const names = list.map((p) => p.lastName);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'fr')));
  });
});
