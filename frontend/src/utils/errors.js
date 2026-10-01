// Transforme une erreur Axios (ou autre) en message lisible pour l'utilisateur.
export function messageErreur(erreur, parDefaut = 'Une erreur est survenue. Veuillez réessayer.') {
  if (!erreur) return parDefaut
  const donnees = erreur.response?.data
  if (typeof donnees === 'string' && donnees.trim()) return donnees
  if (donnees?.message) return donnees.message
  if (donnees?.detail) return donnees.detail
  if (erreur.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre.'
  if (erreur.request && !erreur.response) return 'Impossible de joindre le serveur. Vérifiez votre connexion.'
  return erreur.message || parDefaut
}
