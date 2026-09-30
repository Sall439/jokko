import { cn } from '../../utils/cn'
import { STATUTS } from '../../utils/rendezVous'

const tons = {
  succes: 'bg-succes/10 text-succes',
  attention: 'bg-attention/15 text-[#8a5c00]',
  erreur: 'bg-erreur/10 text-erreur',
  neutre: 'bg-texte/[0.07] text-texte-secondaire',
  primaire: 'bg-primary-soft text-primary-dark',
}

export function Badge({ ton = 'neutre', className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', tons[ton], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ statut, className }) {
  const info = STATUTS[statut] ?? { label: statut, ton: 'neutre' }
  return (
    <Badge ton={info.ton} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {info.label}
    </Badge>
  )
}
