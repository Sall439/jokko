import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '../../utils/cn'

const configuration = {
  info: { icone: Info, classes: 'border-primary/20 bg-primary-soft text-primary-dark' },
  succes: { icone: CircleCheck, classes: 'border-succes/25 bg-succes/10 text-[#1d6b48]' },
  attention: { icone: TriangleAlert, classes: 'border-attention/30 bg-attention/10 text-[#7a5100]' },
  erreur: { icone: CircleAlert, classes: 'border-erreur/25 bg-erreur/10 text-[#a52a33]' },
}

export function Alert({ ton = 'info', titre, children, onFermer, className }) {
  const { icone: Icone, classes } = configuration[ton]
  return (
    <div
      role={ton === 'erreur' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-carte border px-4 py-3 text-sm', classes, className)}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-0.5 leading-relaxed">
        {titre && <p className="font-semibold">{titre}</p>}
        {children && <div>{children}</div>}
      </div>
      {onFermer && (
        <button
          type="button"
          onClick={onFermer}
          className="rounded p-0.5 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Fermer le message</span>
        </button>
      )}
    </div>
  )
}
