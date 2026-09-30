// Règles de validation des formulaires, côté client.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const REGEX_TELEPHONE = /^\+?[0-9\s.-]{9,20}$/

export const MOT_DE_PASSE_MIN = 8

export function validerEmail(valeur) {
  if (!valeur?.trim()) return "L'adresse e-mail est obligatoire."
  if (!REGEX_EMAIL.test(valeur.trim())) return "L'adresse e-mail n'est pas valide."
  return null
}

export function validerTelephone(valeur) {
  if (!valeur?.trim()) return 'Le numéro de téléphone est obligatoire.'
  if (!REGEX_TELEPHONE.test(valeur.trim())) return 'Le numéro de téléphone n’est pas valide (ex. 77 123 45 67).'
  return null
}

export function validerObligatoire(valeur, libelle) {
  return String(valeur ?? '').trim() ? null : `${libelle} est obligatoire.`
}

export function validerMotDePasse(valeur) {
  if (!valeur) return 'Le mot de passe est obligatoire.'
  if (valeur.length < MOT_DE_PASSE_MIN) return `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`
  return null
}

// Retourne un objet { champ: message } ne contenant que les champs en erreur.
export function collecterErreurs(regles) {
  return Object.fromEntries(Object.entries(regles).filter(([, message]) => Boolean(message)))
}
