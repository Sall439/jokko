import type { Service } from '@/types/service';

/**
 * Soins et tarifs du cabinet (B0).
 *
 * Le prix de l'Urgence Dentaire n'est pas donné par le cahier des charges :
 * la valeur de 20 000 FCFA est une hypothèse signalée (voir README et
 * `docs/API_CONTRACT.md`). L'hypothèse est centralisée ici, et nulle part ailleurs.
 */
export const SEED_SERVICES: Service[] = [
  {
    id: 'service-detartrage',
    name: 'Détartrage & Polissage',
    category: 'Prevention',
    description: 'Nettoyage complet des dents et polissage de l’émail.',
    durationMinutes: 45,
    priceFcfa: 25000,
    popular: true,
  },
  {
    id: 'service-consultation',
    name: 'Consultation de Contrôle & Bilan',
    category: 'Prevention',
    description: 'Examen de contrôle et bilan de votre santé bucco-dentaire.',
    durationMinutes: 30,
    priceFcfa: 15000,
    popular: true,
  },
  {
    id: 'service-carie',
    name: 'Soin de Carie & Composite',
    category: 'Soins',
    description: 'Traitement de la carie et restauration en composite.',
    durationMinutes: 60,
    priceFcfa: 35000,
    popular: true,
  },
  {
    id: 'service-blanchiment',
    name: 'Blanchiment Dentaire LED Fauteuil',
    category: 'Esthetique',
    description: 'Éclaircissement des dents au fauteuil avec LED.',
    durationMinutes: 60,
    priceFcfa: 80000,
  },
  {
    id: 'service-extraction',
    name: 'Extraction Dentaire Simple',
    category: 'Chirurgie',
    description: 'Ablation d’une dent sous anesthésie locale.',
    durationMinutes: 45,
    priceFcfa: 40000,
  },
  {
    id: 'service-urgence',
    name: 'Urgence Dentaire & Soulagement',
    category: 'Urgence',
    description: 'Prise en charge d’une douleur aiguë.',
    durationMinutes: 30,
    // Hypothèse : le cahier des charges demande un prix « à confirmer ».
    priceFcfa: 20000,
  },
];

/** Prix de l'urgence : hypothèse explicite, à confirmer par le cabinet. */
export const URGENCE_PRICE_HYPOTHESIS = true;

export function getServiceById(id: string): Service | undefined {
  return SEED_SERVICES.find((service) => service.id === id);
}

/** Soins marqués « Populaire » dans les maquettes. */
export function getPopularServices(): Service[] {
  return SEED_SERVICES.filter((service) => service.popular);
}
