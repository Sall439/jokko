import { SEED_SERVICES } from '@/mocks/services';
import { catalogService, mapServiceDto } from '@/services/catalog';
import { setMockLatency } from '@/services/errors';
import { SERVICE_CATEGORY_LABELS } from '@/types/service';

/** Catalogue de soins et praticiens (B0) : les tarifs affichés viennent du seed. */

beforeAll(() => setMockLatency(0));

describe('catalogService — catalogue', () => {
  it('expose les six soins du cahier des charges', async () => {
    expect(await catalogService.list()).toHaveLength(6);
  });

  it('chaque soin a une durée et un prix en FCFA', async () => {
    for (const service of await catalogService.list()) {
      expect(service.durationMinutes).toBeGreaterThan(0);
      expect(service.priceFcfa).toBeGreaterThan(0);
      expect(Number.isInteger(service.priceFcfa)).toBe(true);
    }
  });

  it('distingue les soins populaires', async () => {
    const list = await catalogService.list();
    const popular = list.filter((service) => service.popular);

    expect(popular.length).toBeGreaterThan(0);
    expect(popular.length).toBeLessThan(list.length);
  });

  it('retrouve un soin par son identifiant', async () => {
    const service = await catalogService.getById('service-detartrage');

    expect(service.name).toBe('Détartrage & Polissage');
    expect(service.priceFcfa).toBe(25000);
    expect(service.durationMinutes).toBe(45);
  });

  it('refuse un identifiant inconnu', async () => {
    await expect(catalogService.getById('service-inexistant')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('filtre par catégorie', async () => {
    const prevention = await catalogService.listByCategory('Prevention');

    expect(prevention.map((service) => service.id)).toEqual([
      'service-detartrage',
      'service-consultation',
    ]);
  });

  it('a un libellé français pour chaque catégorie', () => {
    for (const label of Object.values(SERVICE_CATEGORY_LABELS)) {
      expect(label).not.toMatch(/[A-Z]{2,}/);
    }
  });
});

describe('catalogService — hypothèses signalées', () => {
  it('le prix de l’urgence est une hypothèse non confirmée par le cahier des charges', () => {
    const urgence = SEED_SERVICES.find((service) => service.id === 'service-urgence');

    expect(urgence?.priceFcfa).toBe(20000);
  });
});

describe('mapServiceDto — conversion API snake_case → modèle', () => {
  it('convertit les champs de l’API', () => {
    const service = mapServiceDto({
      id: 'service-detartrage',
      name: 'Détartrage & Polissage',
      category: 'Prevention',
      description: 'Nettoyage complet des dents.',
      duration_minutes: 45,
      price_fcfa: 25000,
      popular: true,
    });

    expect(service.durationMinutes).toBe(45);
    expect(service.priceFcfa).toBe(25000);
    expect(service.popular).toBe(true);
  });

  it('produit un modèle identique au seed pour le même soin', () => {
    const dto = {
      id: 'service-detartrage',
      name: 'Détartrage & Polissage',
      category: 'Prevention',
      description: 'Nettoyage complet des dents et polissage de l’émail.',
      duration_minutes: 45,
      price_fcfa: 25000,
      popular: true,
    };

    expect(mapServiceDto(dto)).toEqual(
      SEED_SERVICES.find((service) => service.id === 'service-detartrage'),
    );
  });
});
