import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCarte } from './AuthCarte'
import { Input } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { USE_MOCK } from '../../services/config'
import { COMPTES_DEMO } from '../../services/mock/mockData'
import { messageErreur } from '../../utils/errors'
import { ROLES, cheminAccueil } from '../../utils/roles'
import { collecterErreurs, validerEmail } from '../../utils/validation'

// Une page demandée avant la connexion n'est reprise que si elle
// appartient à l'espace du rôle connecté.
function destinationApresConnexion(depuis, role) {
  const accueil = cheminAccueil(role)
  return depuis?.startsWith(accueil) ? depuis : accueil
}

export function ConnexionPage() {
  useDocumentTitle('Connexion')
  const { connexion, sessionExpiree, effacerSessionExpiree } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [valeurs, setValeurs] = useState({ email: '', motDePasse: '' })
  const [erreurs, setErreurs] = useState({})
  const [erreurServeur, setErreurServeur] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  const changer = (e) => setValeurs((v) => ({ ...v, [e.target.name]: e.target.value }))

  const soumettre = async (e) => {
    e.preventDefault()
    const nouvelles = collecterErreurs({
      email: validerEmail(valeurs.email),
      motDePasse: valeurs.motDePasse ? null : 'Le mot de passe est obligatoire.',
    })
    setErreurs(nouvelles)
    setErreurServeur(null)
    if (Object.keys(nouvelles).length) return

    setEnvoi(true)
    try {
      const utilisateur = await connexion(valeurs.email.trim(), valeurs.motDePasse)
      navigate(destinationApresConnexion(location.state?.depuis, utilisateur.role), { replace: true })
    } catch (err) {
      setErreurServeur(messageErreur(err, 'Connexion impossible.'))
      setEnvoi(false)
    }
  }

  return (
    <AuthCarte
      titre="Bon retour parmi nous"
      description="Connectez-vous pour gérer vos rendez-vous."
      pied={
        <>
          Pas encore de compte ?{' '}
          <Link to="/inscription" state={location.state} className="font-semibold text-primary hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      {sessionExpiree && (
        <Alert ton="attention" titre="Session expirée" onFermer={effacerSessionExpiree}>
          Pour votre sécurité, merci de vous reconnecter.
        </Alert>
      )}
      {location.state?.depuis && !sessionExpiree && (
        <Alert ton="info">Connectez-vous pour accéder à cette page.</Alert>
      )}
      {erreurServeur && <Alert ton="erreur">{erreurServeur}</Alert>}

      <form onSubmit={soumettre} noValidate className="flex flex-col gap-4">
        <Input
          label="Adresse e-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={valeurs.email}
          onChange={changer}
          erreur={erreurs.email}
          requis
        />
        <Input
          label="Mot de passe"
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          value={valeurs.motDePasse}
          onChange={changer}
          erreur={erreurs.motDePasse}
          requis
        />
        <Button type="submit" chargement={envoi} pleineLargeur taille="lg">
          Se connecter
        </Button>
      </form>

      {USE_MOCK && (
        <div className="flex flex-col gap-2 border-t border-texte/[0.06] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-texte-secondaire">Comptes de démonstration</p>
          <div className="grid grid-cols-3 gap-2">
            {COMPTES_DEMO.map((compte) => (
              <Button
                key={compte.role}
                variante="secondaire"
                taille="sm"
                onClick={() => {
                  setValeurs({ email: compte.email, motDePasse: compte.mot_de_passe })
                  setErreurs({})
                }}
              >
                {ROLES[compte.role]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthCarte>
  )
}
