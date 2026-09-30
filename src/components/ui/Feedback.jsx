import { LoaderCircle } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'
import { Alert } from './Alert'

export function Loader({ label = 'Chargement…', className }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-10 text-sm text-texte-secondaire', className)}>
      <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-bouton bg-texte/[0.07]', className)} aria-hidden="true" />
}

export function EmptyState({ icone: Icone, titre, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      {Icone && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icone className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-display text-h3 text-texte">{titre}</p>
        {description && <p className="text-pretty text-sm leading-relaxed text-texte-secondaire">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onReessayer }) {
  return (
    <Alert ton="erreur" titre="Chargement impossible">
      <div className="flex flex-col items-start gap-2">
        <span>{message}</span>
        {onReessayer && (
          <Button variante="secondaire" taille="sm" onClick={onReessayer}>
            Réessayer
          </Button>
        )}
      </div>
    </Alert>
  )
}
