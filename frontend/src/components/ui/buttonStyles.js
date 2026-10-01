import { cn } from '../../utils/cn'

const base =
  'inline-flex items-center justify-center gap-2 rounded-bouton font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-fond disabled:cursor-not-allowed disabled:opacity-50'

const variantes = {
  primaire: 'bg-primary text-carte hover:bg-primary-dark',
  secondaire: 'border border-primary text-primary bg-carte hover:bg-primary-soft',
  discret: 'text-texte hover:bg-primary-soft hover:text-primary-dark',
  danger: 'bg-erreur text-carte hover:bg-erreur/90',
  dangerDiscret: 'text-erreur hover:bg-erreur/10',
}

const tailles = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icone: 'h-10 w-10',
}

export function classesBouton({ variante = 'primaire', taille = 'md', pleineLargeur = false, className } = {}) {
  return cn(base, variantes[variante], tailles[taille], pleineLargeur && 'w-full', className)
}
