import { cn } from '../../utils/cn'

export function Card({ as: Balise = 'section', titre, description, action, className, corpsClassName, children, ...props }) {
  return (
    <Balise className={cn('rounded-carte border border-texte/[0.06] bg-carte shadow-carte', className)} {...props}>
      {(titre || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-texte/[0.06] px-5 py-4">
          <div className="flex flex-col gap-0.5">
            {titre && <h2 className="font-display text-h3 text-texte">{titre}</h2>}
            {description && <p className="text-sm text-texte-secondaire">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-5', corpsClassName)}>{children}</div>
    </Balise>
  )
}
