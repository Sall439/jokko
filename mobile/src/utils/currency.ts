import { Brand } from '@/constants/brand';

/**
 * Formatage monétaire (A3) : devise FCFA, format `25 000 FCFA`.
 *
 * Espace insécable fine entre le montant et la devise pour éviter qu'un retour
 * à la ligne coupe « 25 000 FCFA » en deux.
 */
export function formatFcfa(amount: number): string {
  if (!Number.isFinite(amount)) return `0\u00a0${Brand.rules.devise}`;

  const rounded = Math.round(amount);
  // `fr-FR` utilise le point comme séparateur de milliers ; on le remplace par
  // une espace insécable fine, plus lisible dans un contexte francophone.
  const grouped = rounded.toLocaleString('fr-FR').replace(/ | /g, '\u202f');

  return `${grouped}\u00a0${Brand.rules.devise}`;
}
