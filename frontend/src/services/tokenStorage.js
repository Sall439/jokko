// Stockage du jeton JWT côté navigateur.
const CLE = 'jokkodentiste_token'

export const tokenStorage = {
  lire() {
    try {
      return window.localStorage.getItem(CLE)
    } catch {
      return null
    }
  },
  enregistrer(token) {
    try {
      window.localStorage.setItem(CLE, token)
    } catch {
      // Stockage indisponible (navigation privée) : la session restera en mémoire.
    }
  },
  effacer() {
    try {
      window.localStorage.removeItem(CLE)
    } catch {
      // Rien à faire
    }
  },
}
