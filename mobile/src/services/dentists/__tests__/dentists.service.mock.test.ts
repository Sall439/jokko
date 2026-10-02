import { dentistsService } from '@/services/dentists';
import { setMockLatency } from '@/services/errors';
import { getDentistDisplayName, getDentistInitials } from '@/types/dentist';
import { SEED_AVAILABILITY } from '@/mocks/availability';

/** Praticiens du cabinet (B0). */

beforeAll(() => setMockLatency(0));

describe('dentistsService', () => {
  it('expose les deux dentistes du cahier des charges', async () => {
    const list = await dentistsService.list();

    expect(list.map((dentist) => dentist.lastName)).toEqual(['Ndiaye', 'Fall']);
  });

  it('retrouve un dentiste par son identifiant', async () => {
    const dentist = await dentistsService.getById('dentist-ndiaye');

    expect(getDentistDisplayName(dentist)).toBe('Dr. Aminata Ndiaye');
    expect(dentist.rating).toBe(4.95);
  });

  it('refuse un identifiant inconnu', async () => {
    await expect(dentistsService.getById('dentist-inconnu')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('Présentation des dentistes', () => {
  it('préfixe le nom par « Dr. »', () => {
    expect(getDentistDisplayName({ firstName: 'Aminata', lastName: 'Ndiaye' })).toBe(
      'Dr. Aminata Ndiaye',
    );
  });

  it('compose les initiales pour l’avatar', () => {
    expect(getDentistInitials({ firstName: 'Aminata', lastName: 'Ndiaye' })).toBe('AN');
    expect(getDentistInitials({ firstName: 'Babacar', lastName: 'Fall' })).toBe('BF');
  });
});

describe('Couverture des disponibilités (B0)', () => {
  it('chaque dentiste a une entrée de disponibilités', () => {
    expect(Object.keys(SEED_AVAILABILITY).sort()).toEqual(['dentist-fall', 'dentist-ndiaye']);
  });

  it('seul le Dr Ndiaye a des plages déclarées dans le cahier des charges', () => {
    expect(SEED_AVAILABILITY['dentist-fall']).toEqual({
      0: null,
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    });
  });
});
