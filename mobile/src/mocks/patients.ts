import type { Patient } from '@/types/patient';

/**
 * Patients du cabinet (B0), données de démonstration.
 *
 * Ce catalogue est distinct des comptes d'authentification : un patient peut
 * être enregistré à l'accueil sans avoir jamais ouvert l'application mobile.
 * Seul `u-patient-1` a un compte, parce que c'est le compte de démonstration
 * (A6.7). Les autres servent à rendre l'espace praticien lisible.
 */
export const SEED_PATIENTS: Patient[] = [
  {
    id: 'u-patient-1',
    firstName: 'Moussa',
    lastName: 'Diop',
    phone: '+221 77 452 89 10',
  },
  {
    id: 'u-patient-2',
    firstName: 'Fatou',
    lastName: 'Sène',
    phone: '+221 76 320 41 18',
  },
  {
    id: 'u-patient-3',
    firstName: 'Ibrahima',
    lastName: 'Sow',
    phone: '+221 70 118 75 63',
  },
  {
    id: 'u-patient-4',
    firstName: 'Ndèye',
    lastName: 'Diouf',
    phone: '+221 78 604 22 37',
  },
];

export function getPatientById(id: string): Patient | undefined {
  return SEED_PATIENTS.find((patient) => patient.id === id);
}
