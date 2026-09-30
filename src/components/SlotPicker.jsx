import { Clock } from 'lucide-react'
import { cn } from '../utils/cn'
import { formatHeure } from '../utils/dates'
import { EmptyState, Skeleton } from './ui/Feedback'

const RAISONS = { reserve: 'déjà réservé', passe: 'passé' }

function Groupe({ titre, creneaux, valeur, onChange }) {
  if (!creneaux.length) return null
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-texte-secondaire">{titre}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {creneaux.map((c) => {
          const selectionne = valeur === c.debut
          const heure = formatHeure(c.debut)
          return (
            <button
              key={c.debut}
              type="button"
              disabled={!c.disponible}
              aria-pressed={selectionne}
              aria-label={c.disponible ? `${heure}, libre` : `${heure}, ${RAISONS[c.raison] ?? 'indisponible'}`}
              title={c.disponible ? undefined : `Créneau ${RAISONS[c.raison] ?? 'indisponible'}`}
              onClick={() => onChange(c.debut)}
              className={cn(
                'h-11 rounded-bouton border text-sm font-medium tabular-nums transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                c.disponible && !selectionne && 'border-primary/30 bg-carte text-primary-dark hover:border-primary hover:bg-primary-soft',
                selectionne && 'border-primary bg-primary text-carte',
                !c.disponible && 'cursor-not-allowed border-transparent bg-texte/[0.05] text-texte-secondaire/60 line-through',
              )}
            >
              {heure}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

// Liste des créneaux d'une journée. Les créneaux réservés ou passés
// sont affichés barrés et ne peuvent pas être sélectionnés.
export function SlotPicker({ creneaux = [], valeur, onChange, chargement = false, messageVide }) {
  if (chargement) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
        <span className="sr-only">Chargement des créneaux…</span>
      </div>
    )
  }

  if (!creneaux.length) {
    return (
      <EmptyState
        icone={Clock}
        titre="Aucun créneau ce jour-là"
        description={messageVide ?? 'Le dentiste ne consulte pas à cette date. Essayez un autre jour.'}
        className="py-6"
      />
    )
  }

  const libres = creneaux.filter((c) => c.disponible).length
  const matin = creneaux.filter((c) => new Date(c.debut).getHours() < 13)
  const apresMidi = creneaux.filter((c) => new Date(c.debut).getHours() >= 13)

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-texte-secondaire" aria-live="polite">
        {libres === 0
          ? 'Tous les créneaux de cette journée sont pris. Essayez un autre jour.'
          : `${libres} créneau${libres > 1 ? 'x' : ''} libre${libres > 1 ? 's' : ''}`}
      </p>
      <Groupe titre="Matin" creneaux={matin} valeur={valeur} onChange={onChange} />
      <Groupe titre="Après-midi" creneaux={apresMidi} valeur={valeur} onChange={onChange} />
    </div>
  )
}
