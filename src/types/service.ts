/** Catégories de soins retenues dans le cahier des charges (B0). */
export type ServiceCategory = 'Prevention' | 'Soins' | 'Esthetique' | 'Chirurgie' | 'Urgence';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  Prevention: 'Prévention',
  Soins: 'Soins',
  Esthetique: 'Esthétique',
  Chirurgie: 'Chirurgie',
  Urgence: 'Urgence',
};

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  /** Description courte affichée sur la carte de sélection. */
  description: string;
  /** Durée en minutes : détermine la fin du rendez-vous (A8.3). */
  durationMinutes: number;
  /** Prix en FCFA (XOF). Entier, sans décimales. */
  priceFcfa: number;
  /** Soins les plus demandés, signalés par un badge « Populaire ». */
  popular?: boolean;
}
