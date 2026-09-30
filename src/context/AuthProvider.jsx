import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { authService } from '../services/authService'
import { tokenStorage } from '../services/tokenStorage'
import { EVENEMENT_SESSION_EXPIREE } from '../services/apiClient'

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [initialisation, setInitialisation] = useState(() => Boolean(tokenStorage.lire()))
  const [sessionExpiree, setSessionExpiree] = useState(false)

  // Restaure la session à partir du jeton enregistré.
  useEffect(() => {
    if (!tokenStorage.lire()) return
    let actif = true
    authService
      .moi()
      .then((u) => actif && setUtilisateur(u))
      .catch(() => {
        tokenStorage.effacer()
        if (actif) setUtilisateur(null)
      })
      .finally(() => actif && setInitialisation(false))
    return () => {
      actif = false
    }
  }, [])

  // Déconnexion automatique lorsque l'API répond 401.
  useEffect(() => {
    const surExpiration = () => {
      setUtilisateur((precedent) => {
        if (precedent) setSessionExpiree(true)
        return null
      })
    }
    window.addEventListener(EVENEMENT_SESSION_EXPIREE, surExpiration)
    return () => window.removeEventListener(EVENEMENT_SESSION_EXPIREE, surExpiration)
  }, [])

  const ouvrirSession = useCallback(({ token, utilisateur: u }) => {
    tokenStorage.enregistrer(token)
    setUtilisateur(u)
    setSessionExpiree(false)
    return u
  }, [])

  const connexion = useCallback(
    async (email, motDePasse) => ouvrirSession(await authService.connecter(email, motDePasse)),
    [ouvrirSession],
  )

  const inscription = useCallback(
    async (donnees) => ouvrirSession(await authService.inscrire(donnees)),
    [ouvrirSession],
  )

  const deconnexion = useCallback(() => {
    tokenStorage.effacer()
    setUtilisateur(null)
  }, [])

  const mettreAJourProfil = useCallback(async (donnees) => {
    const u = await authService.modifierProfil(donnees)
    setUtilisateur(u)
    return u
  }, [])

  const valeur = useMemo(
    () => ({
      utilisateur,
      estConnecte: Boolean(utilisateur),
      initialisation,
      sessionExpiree,
      effacerSessionExpiree: () => setSessionExpiree(false),
      connexion,
      inscription,
      deconnexion,
      mettreAJourProfil,
    }),
    [utilisateur, initialisation, sessionExpiree, connexion, inscription, deconnexion, mettreAJourProfil],
  )

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}
