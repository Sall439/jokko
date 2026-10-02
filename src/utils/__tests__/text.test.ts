import { capitalize } from '@/utils/text';

/** Utilitaires de texte partagés par les écrans. */

describe('capitalize', () => {
  it('met la première lettre en majuscule', () => {
    expect(capitalize('lundi 5 octobre 2026')).toBe('Lundi 5 octobre 2026');
  });

  it('laisse le reste du texte inchangé', () => {
    // Une majuscule forcée au milieu donnerait une faute de typographie.
    expect(capitalize('détartrage et contrôle')).toBe('Détartrage et contrôle');
  });

  it('ne touche pas une chaîne déjà capitalisée', () => {
    expect(capitalize('Dr. Aminata Ndiaye')).toBe('Dr. Aminata Ndiaye');
  });

  it('renvoie une chaîne vide telle quelle', () => {
    expect(capitalize('')).toBe('');
  });

  it('gère les accents en début de mot', () => {
    expect(capitalize('évaluation')).toBe('Évaluation');
  });

  it('conserve la longueur de la chaîne', () => {
    expect(capitalize('abcdef')).toHaveLength(6);
  });
});
