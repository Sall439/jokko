/**
 * Petits utilitaires de texte, partagés par les écrans.
 *
 * Les dates sont formatées dans `utils/date` et les durées dans `utils/time` :
 * ce fichier ne contient que ce qui n'appartient à aucun des deux.
 */

/**
 * Première lettre en majuscule, le reste inchangé.
 *
 * `formatLongDate` renvoie « lundi 5 octobre 2026 » ; mis en tête d'un titre ou
 * d'un encart, il doit commencer par une majuscule. La locale française
 * demande aussi une espace insécable avant `: ; ! ? »` — c'est le rôle du
 * composant, pas d'une fonction de formatage de date.
 */
export function capitalize(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Retire les diacritiques et met en minuscules, pour la recherche.
 *
 * Un patient tape « aissatou » et doit trouver « Aïssatou » : sans cela, la
 * recherche échouerait sur les noms et prénoms sénégalais.
 */
export function foldSearchText(value: string): string {
  // NFD décompose « ï » en « i » + « ï » ; la classe retire alors le seul
  // caractère diacritique et laisse la lettre latine.
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
