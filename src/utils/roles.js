export const ROLES = {
  patient: 'Patient',
  dentiste: 'Dentiste',
  admin: 'Administrateur',
}

export const LISTE_ROLES = Object.entries(ROLES).map(([valeur, label]) => ({ valeur, label }))

export function cheminAccueil(role) {
  if (role === 'dentiste') return '/dentiste'
  if (role === 'admin') return '/admin'
  return '/patient'
}

export function nomComplet(personne) {
  if (!personne) return ''
  return `${personne.prenom ?? ''} ${personne.nom ?? ''}`.trim()
}

export function nomPraticien(praticien) {
  return praticien ? `Dr ${nomComplet(praticien)}` : ''
}

export function initiales(personne) {
  if (!personne) return ''
  return `${personne.prenom?.[0] ?? ''}${personne.nom?.[0] ?? ''}`.toUpperCase()
}
