import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { Logo } from '../components/Logo'
import { useAuth } from '../hooks/useAuth'
import { cheminAccueil } from '../utils/roles'
import { USE_MOCK } from '../services/config'

// Gabarit de l'espace connecté : menu latéral fixe sur ordinateur,
// tiroir sur mobile.
export function DashboardLayout() {
  const { utilisateur } = useAuth()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    if (!menuOuvert) return undefined
    const surTouche = (e) => e.key === 'Escape' && setMenuOuvert(false)
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [menuOuvert])

  return (
    <div className="min-h-screen bg-fond">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-bouton focus:bg-carte focus:px-4 focus:py-2 focus:text-primary focus:shadow-carte"
      >
        Aller au contenu
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {menuOuvert && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-texte/40" aria-hidden="true" onClick={() => setMenuOuvert(false)} />
          <div className="relative h-full w-72 max-w-[85vw]">
            <Sidebar onNaviguer={() => setMenuOuvert(false)} />
            <button
              type="button"
              onClick={() => setMenuOuvert(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-bouton text-carte hover:bg-carte/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Fermer le menu</span>
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-texte/[0.06] bg-carte/95 px-4 backdrop-blur lg:hidden">
          <Logo vers={cheminAccueil(utilisateur?.role)} />
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            aria-expanded={menuOuvert}
            className="flex h-10 w-10 items-center justify-center rounded-bouton text-texte hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Ouvrir le menu</span>
          </button>
        </header>

        {USE_MOCK && (
          <p className="border-b border-attention/20 bg-attention/10 px-4 py-1.5 text-center text-xs text-[#7a5100]">
            Mode démonstration : les données sont simulées et réinitialisées à la fermeture de l&apos;onglet.
          </p>
        )}

        <main id="contenu" className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
