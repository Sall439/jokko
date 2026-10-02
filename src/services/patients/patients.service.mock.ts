import { appointmentsService } from '@/services/appointments';
import { DomainError, wait } from '@/services/errors';
import { SEED_PATIENTS, getPatientById } from '@/mocks/patients';
import { buildPatientList } from '@/utils/patients';
import type { Patient, PatientSummary } from '@/types/patient';

/** Contrat du domaine « patients » : implémenté par le mock, puis par l'API. */
export interface IPatientsService {
  /** Annuaire des patients du cabinet. */
  list(): Promise<Patient[]>;
  /**
   * Patients suivis par un praticien, avec leur historique.
   *
   * Ne renvoie que les patients ayant un rendez-vous avec **ce** praticien
   * (A8.6) : un praticien ne voit jamais la file d'attente d'un collègue.
   */
  listForDentist(dentistId: string, now?: Date): Promise<PatientSummary[]>;
  getById(id: string): Promise<Patient>;
}

export const mockPatientsService: IPatientsService = {
  async list() {
    await wait();
    return SEED_PATIENTS;
  },

  async listForDentist(dentistId, now = new Date()) {
    const appointments = await appointmentsService.listForDentist(dentistId, now);
    await wait();

    return buildPatientList(appointments, SEED_PATIENTS, now);
  },

  async getById(id) {
    await wait();

    const found = getPatientById(id);
    if (!found) throw new DomainError('NOT_FOUND', "Ce patient n'existe pas.");

    return found;
  },
};

export type { Patient, PatientSummary } from '@/types/patient';
