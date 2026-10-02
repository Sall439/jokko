import { DomainError, wait } from '@/services/errors';
import { getServiceById, SEED_SERVICES } from '@/mocks/services';
import type { Service, ServiceCategory } from '@/types/service';

/** Contrat du domaine « catalogue de soins » : mock aujourd'hui, API en Phase 7. */
export interface ICatalogService {
  list(): Promise<Service[]>;
  getById(id: string): Promise<Service>;
  /** Soins d'une catégorie, pour le regroupement par onglet dans l'onglet Soins. */
  listByCategory(category: ServiceCategory): Promise<Service[]>;
}

export const mockCatalogService: ICatalogService = {
  async list() {
    await wait();
    return SEED_SERVICES;
  },

  async getById(id) {
    await wait();
    const found = getServiceById(id);
    if (!found) throw new DomainError('NOT_FOUND', "Ce soin n'existe pas.");
    return found;
  },

  async listByCategory(category) {
    await wait();
    return SEED_SERVICES.filter((service) => service.category === category);
  },
};
