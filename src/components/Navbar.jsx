import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { ButtonLink } from './ui/Button'
import { useAuth } from '../hooks/useAuth'
import { cheminAccueil } from '../utils/roles'
import { cn } from '../utils/cn'

const LIENS = [
  { vers: '/#soins', label: 'Nos soins' },
  { vers: '/#equipe', label: "L'équipe" },
  { vers: '/#infos', label: 'Infos pratiques' },
]

// Barre de navigation des pages publiques.
export function Navbar() {
  const { utilisateur } = useAuth()
  const [ouvert, setOuvert] = useState(false)

  const actions = utilisateur ? (
    <ButtonLink to={cheminAccueil(utilisateur.role)} taille="sm">
      Mon espace
    </ButtonLink>
  ) : (
    <>
      <ButtonLink to="/connexion" variante="discret" taille="sm">
        Se connecter
      </ButtonLink>
      <ButtonLink to="/inscription" taille="sm">
        Créer un compte
      </ButtonLink>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-texte/[0.06] bg-carte/95 backdrop-blur">
      <nav aria-label="Navigation principale" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <ul className="hidden items-center gap-6 md:flex">
          {LIENS.map((l) => (
            <li key={l.vers}>
              <a href={l.vers} className="text-sm font-medium text-texte-secondaire hover:text-primary">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">{actions}</div>
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-controls="menu-mobile"
          className="flex h-10 w-10 items-center justify-center rounded-bouton text-texte hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
        >
          {ouvert ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          <span className="sr-only">{ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
        </button>
      </nav>
      <div id="menu-mobile" className={cn('border-t border-texte/[0.06] px-4 pb-4 md:hidden', !ouvert && 'hidden')}>
        <ul className="flex flex-col py-2">
          {LIENS.map((l) => (
            <li key={l.vers}>
              <a
                href={l.vers}
                onClick={() => setOuvert(false)}
                className="block rounded-bouton px-2 py-3 text-sm font-medium text-texte hover:bg-primary-soft"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2" onClick={() => setOuvert(false)}>
          {actions}
        </div>
      </div>
    </header>
  )
}
