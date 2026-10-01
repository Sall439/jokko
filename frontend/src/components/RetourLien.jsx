import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function RetourLien({ vers, children = 'Retour' }) {
  return (
    <Link
      to={vers}
      className="inline-flex w-fit items-center gap-1.5 rounded-bouton text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  )
}
