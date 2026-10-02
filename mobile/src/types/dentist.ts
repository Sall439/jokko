/** Dentiste du cabinet (B0). */
export interface Dentist {
  id: string;
  firstName: string;
  lastName: string;
  /** Spécialité affichée sur la carte de sélection. */
  specialty: string;
  /** Note sur 5, affichée avec une étoile. */
  rating: number;
}

/** Nom complet avec le préfixe d'usage du cabinet (« Dr. Aminata Ndiaye »). */
export function getDentistDisplayName(dentist: Pick<Dentist, 'firstName' | 'lastName'>): string {
  return `Dr. ${dentist.firstName} ${dentist.lastName}`;
}

/** Initiales pour l'avatar lorsqu'aucune photo n'est fournie. */
export function getDentistInitials(dentist: Pick<Dentist, 'firstName' | 'lastName'>): string {
  return `${dentist.firstName.charAt(0)}${dentist.lastName.charAt(0)}`.toUpperCase();
}
