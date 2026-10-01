import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCarte } from './AuthCarte'
import { Input } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { messageErreur } from '../../utils/errors'
import {
  MOT_DE_PASSE_MIN,
  collecterErreurs,
  validerEmail,
  validerMotDePasse,
  validerObligatoire,
  validerTelephone,
} from '../../utils/validation'

const VIDE = { prenom: '', nom: '', email: '', telephone: '', motDePasse: '', confirmation: '' }

export function InscriptionPage() {
  useDocumentTitle('Créer un compte')
  const { inscription } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [valeurs, setValeurs] = useState(VIDE)
  const [erreurs, setErreurs] = useState({})
  const [erreurServeur, setErreurServeur] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  const changer = (e) => setValeurs((v) => ({ ...v, [e.target.name]: e.target.value }))

  const soumettre = async (e) => {
    e.preventDefault()
    const nouvelles = collecterErreurs({
      prenom: validerObligatoire(valeurs.prenom, 'Le prénom'),
      nom: validerObligatoire(valeurs.nom, 'Le nom'),
      email: validerEmail(valeurs.email),
      telephone: validerTelephone(valeurs.telephone),
      motDePasse: validerMotDePasse(valeurs.motDePasse),
      confirmation:
        valeurs.confirmation !== valeurs.motDePasse ? 'Les deux mots de passe ne correspondent pas.' : null,
    })
    setErreurs(nouvelles)
    setErreurServeur(null)
    if (Object.keys(nouvelles).length) return

    setEnvoi(true)
    try {
      await inscription({
        prenom: valeurs.prenom.trim(),
        nom: valeurs.nom.trim(),
        email: valeurs.email.trim(),
        telephone: valeurs.telephone.trim(),
        mot_de_passe: valeurs.motDePasse,
      })
      const depuis = location.state?.depuis
      navigate(depuis?.startsWith('/patient') ? depuis : '/patient', { replace: true })
    } catch (err) {
      setErreurServeur(messageErreur(err, 'Inscription impossible.'))
      setEnvoi(false)
    }
  }

  return (
    <AuthCarte
      titre="Créer votre compte patient"
      description="Quelques informations pour que le cabinet puisse vous recontacter."
      pied={
        <>
          Déjà inscrit ?{' '}
          <Link to="/connexion" state={location.state} className="font-semibold text-primary hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      {erreurServeur && <Alert ton="erreur">{erreurServeur}</Alert>}
      <form onSubmit={soumettre} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Prénom" name="prenom" autoComplete="given-name" value={valeurs.prenom} onChange={changer} erreur={erreurs.prenom} requis />
          <Input label="Nom" name="nom" autoComplete="family-name" value={valeurs.nom} onChange={changer} erreur={erreurs.nom} requis />
        </div>
        <Input label="Adresse e-mail" name="email" type="email" autoComplete="email" value={valeurs.email} onChange={changer} erreur={erreurs.email} requis />
        <Input
          label="Téléphone"
          name="telephone"
          type="tel"
          autoComplete="tel"
          placeholder="77 123 45 67"
          value={valeurs.telephone}
          onChange={changer}
          erreur={erreurs.telephone}
          requis
        />
        <Input
          label="Mot de passe"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          aide={`Au moins ${MOT_DE_PASSE_MIN} caractères.`}
          value={valeurs.motDePasse}
          onChange={changer}
          erreur={erreurs.motDePasse}
          requis
        />
        <Input
          label="Confirmer le mot de passe"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          value={valeurs.confirmation}
          onChange={changer}
          erreur={erreurs.confirmation}
          requis
        />
        <Button type="submit" chargement={envoi} pleineLargeur taille="lg">
          Créer mon compte
        </Button>
      </form>
    </AuthCarte>
  )
}
