import { Compass, ShieldAlert } from 'lucide-react'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/Feedback'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cheminAccueil } from '../../utils/roles'

function RetourAccueil() {
  const { utilisateur } = useAuth()
  return (
    <ButtonLink to={utilisateur ? cheminAccueil(utilisateur.role) : '/'}>
      {utilisateur ? 'Retour à mon espace' : "Retour à l'accueil"}
    </ButtonLink>
  )
}

export function AccesRefusePage() {
  useDocumentTitle('Accès refusé')
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <EmptyState
        icone={ShieldAlert}
        titre="Accès refusé"
        description="Cette page est réservée à un autre type de compte."
        action={<RetourAccueil />}
      />
    </div>
  )
}

export function IntrouvablePage() {
  useDocumentTitle('Page introuvable')
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <EmptyState
        icone={Compass}
        titre="Page introuvable"
        description="Le lien est peut-être erroné ou la page a été déplacée."
        action={<RetourAccueil />}
      />
    </div>
  )
}
