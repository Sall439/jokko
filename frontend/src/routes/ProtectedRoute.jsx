import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Loader } from '../components/ui/Feedback'
import { cheminAccueil } from '../utils/roles'

// Protège un groupe de routes : exige une session et, si `roles` est fourni,
// l'un des rôles autorisés. Redirige vers la connexion en mémorisant la page visée.
export function ProtectedRoute({ roles }) {
  const { utilisateur, initialisation } = useAuth()
  const location = useLocation()

  if (initialisation) {
    return <Loader label="Vérification de votre session…" className="min-h-screen" />
  }

  if (!utilisateur) {
    return <Navigate to="/connexion" replace state={{ depuis: location.pathname + location.search }} />
  }

  if (roles && !roles.includes(utilisateur.role)) {
    return <Navigate to="/acces-refuse" replace />
  }

  return <Outlet />
}

// Pages réservées aux visiteurs non connectés (connexion, inscription).
export function PublicOnlyRoute() {
  const { utilisateur, initialisation } = useAuth()
  if (initialisation) return <Loader className="min-h-screen" />
  if (utilisateur) return <Navigate to={cheminAccueil(utilisateur.role)} replace />
  return <Outlet />
}
