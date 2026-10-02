import { Brand } from '@/constants/brand';

/**
 * Règles du cabinet affichées au patient (B0).
 * Source unique : ces textes apparaîtront dans plusieurs écrans
 * (Phase 5 : « Mon compte », « Mes RDV », écran de confirmation).
 */
export const CABINET_RULES: { title: string; text: string }[] = [
  {
    title: 'Ponctualité',
    text: `Présentez-vous ${Brand.rules.arriveeAvanceMinutes} minutes avant l'heure prévue.`,
  },
  {
    title: 'Annulation',
    text: `Vous pouvez annuler en ligne jusqu'à ${Brand.rules.annulationHeuresAvant} heures avant votre rendez-vous.`,
  },
  {
    title: 'Paiement',
    text: 'Le paiement se fait sur place : espèces, carte, Wave ou Orange Money.',
  },
];
