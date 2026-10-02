import { SEED_DENTISTS, getDentistById } from '@/mocks/dentists';
import { DomainError, wait } from '@/services/errors';
import type { Dentist } from '@/types/dentist';

/** Contrat du domaine « praticiens » : implémenté par le mock, puis par l'API. */
export interface IDentistsService {
  list(): Promise<Dentist[]>;
  getById(id: string): Promise<Dentist>;
}

export const mockDentistsService: IDentistsService = {
  async list() {
    await wait();
    return SEED_DENTISTS;
  },

  async getById(id) {
    await wait();
    const found = getDentistById(id);
    if (!found) throw new DomainError('NOT_FOUND', "Ce praticien n'existe pas.");
    return found;
  },
};
