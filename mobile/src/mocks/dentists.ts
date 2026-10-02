import type { Dentist } from '@/types/dentist';

/** Dentistes du cabinet (B0). */
export const SEED_DENTISTS: Dentist[] = [
  {
    id: 'dentist-ndiaye',
    firstName: 'Aminata',
    lastName: 'Ndiaye',
    specialty: 'Chirurgien-Dentiste & Esthétique',
    rating: 4.95,
  },
  {
    id: 'dentist-fall',
    firstName: 'Babacar',
    lastName: 'Fall',
    specialty: 'Orthodontie & Implantologie',
    rating: 4.88,
  },
];

export function getDentistById(id: string): Dentist | undefined {
  return SEED_DENTISTS.find((dentist) => dentist.id === id);
}
