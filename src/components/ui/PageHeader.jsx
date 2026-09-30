export function PageHeader({ titre, description, actions, retour }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {retour}
        <h1 className="text-balance font-display text-2xl font-bold text-texte md:text-h1">{titre}</h1>
        {description && <p className="text-pretty leading-relaxed text-texte-secondaire">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
