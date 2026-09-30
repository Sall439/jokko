import { NavLink } from 'react-router-dom'
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  House,
  LogOut,
  Stethoscope,
  Syringe,
  UserRound,
  Users,
} from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '../hooks/useAuth'
import { ROLES, cheminAccueil, initiales, nomComplet } from '../utils/roles'
import { cn } from '../utils/cn'

const NAVIGATION = {
  patient: [
    { vers: '/patient', label: 'Tableau de bord', icone: House, fin: true },
    { vers: '/patient/nouveau-rendez-vous', label: 'Nouveau rendez-vous', icone: CalendarPlus },
    { vers: '/patient/rendez-vous', label: 'Mes rendez-vous', icone: ClipboardList },
    { vers: '/patient/profil', label: 'Mon profil', icone: UserRound },
  ],
  dentiste: [
    { vers: '/dentiste', label: 'Mon agenda', icone: CalendarDays, fin: true },
    { vers: '/dentiste/disponibilites', label: 'Mes disponibilités', icone: CalendarClock },
    { vers: '/dentiste/profil', label: 'Mon profil', icone: UserRound },
  ],
  admin: [
    { vers: '/admin', label: 'Tableau de bord', icone: House, fin: true },
    { vers: '/admin/rendez-vous', label: 'Rendez-vous', icone: ClipboardList },
    { vers: '/admin/dentistes', label: 'Dentistes', icone: Stethoscope },
    { vers: '/admin/services', label: 'Services', icone: Syringe },
    { vers: '/admin/utilisateurs', label: 'Utilisateurs', icone: Users },
    { vers: '/admin/profil', label: 'Mon profil', icone: UserRound },
  ],
}

// Menu latéral de l'espace connecté, adapté au rôle de l'utilisateur.
export function Sidebar({ onNaviguer }) {
  const { utilisateur, deconnexion } = useAuth()
  const liens = NAVIGATION[utilisateur?.role] ?? []

  return (
    <div className="flex h-full flex-col bg-primary-dark text-carte">
      <div className="flex h-16 items-center px-5">
        <Logo vers={cheminAccueil(utilisateur?.role)} clair />
      </div>

      <nav aria-label="Menu de l'espace personnel" className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {liens.map(({ vers, label, icone: Icone, fin }) => (
            <li key={vers}>
              <NavLink
                to={vers}
                end={fin}
                onClick={onNaviguer}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-bouton px-3 py-2.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carte/70',
                    isActive ? 'bg-carte text-primary-dark' : 'text-carte/85 hover:bg-carte/10 hover:text-carte',
                  )
                }
              >
                <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-carte/15 px-5 py-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-carte/15 text-sm font-semibold"
          aria-hidden="true"
        >
          {initiales(utilisateur)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{nomComplet(utilisateur)}</p>
          <p className="truncate text-xs text-carte/75">{ROLES[utilisateur?.role]}</p>
        </div>
        <button
          type="button"
          onClick={deconnexion}
          className="flex h-10 w-10 items-center justify-center rounded-bouton text-carte/85 hover:bg-carte/10 hover:text-carte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carte/70"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Se déconnecter</span>
        </button>
      </div>
    </div>
  )
}
