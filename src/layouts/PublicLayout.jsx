import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { Logo } from '../components/Logo'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-fond">
      <Navbar />
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-texte/[0.06] bg-carte">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-texte-secondaire sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p>{`© ${new Date().getFullYear()} JokkoDentiste · Cabinet dentaire, Dakar`}</p>
        </div>
      </footer>
    </div>
  )
}
