import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../utils/cn'
import { addDays, formatDateLongue, formatMoisAnnee, isSameDay, startOfDay, startOfWeek, toISODate } from '../utils/dates'

const ENTETES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const debutDuMois = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const decalerMois = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1)

// Calendrier mensuel accessible au clavier (flèches, Début/Fin, PageHaut/PageBas).
// `estDesactive(date)` permet de griser les jours passés ou sans consultation.
export function Calendar({ valeur, onChange, estDesactive = () => false, moisMin, libelle = 'Choisir une date' }) {
  const [mois, setMois] = useState(() => debutDuMois(valeur ?? new Date()))
  const [focus, setFocus] = useState(() => startOfDay(valeur ?? new Date()))
  const grilleRef = useRef(null)
  const doitFocaliser = useRef(false)
  const limite = moisMin ? debutDuMois(moisMin) : null

  const jours = useMemo(() => {
    const debut = startOfWeek(mois)
    const fin = addDays(startOfWeek(new Date(mois.getFullYear(), mois.getMonth() + 1, 0)), 6)
    const liste = []
    for (let d = debut; d <= fin; d = addDays(d, 1)) liste.push(d)
    return liste
  }, [mois])

  useEffect(() => {
    if (!doitFocaliser.current) return
    doitFocaliser.current = false
    grilleRef.current?.querySelector(`[data-date="${toISODate(focus)}"]`)?.focus()
  }, [focus, mois])

  const deplacerFocus = (nouvelle) => {
    if (limite && nouvelle < limite) return
    doitFocaliser.current = true
    setFocus(nouvelle)
    if (nouvelle.getMonth() !== mois.getMonth() || nouvelle.getFullYear() !== mois.getFullYear()) {
      setMois(debutDuMois(nouvelle))
    }
  }

  const surTouche = (e, jour) => {
    const deplacements = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -((jour.getDay() + 6) % 7),
      End: 6 - ((jour.getDay() + 6) % 7),
    }
    if (e.key in deplacements) {
      e.preventDefault()
      deplacerFocus(addDays(jour, deplacements[e.key]))
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      const cible = new Date(jour)
      cible.setMonth(cible.getMonth() + (e.key === 'PageUp' ? -1 : 1))
      deplacerFocus(cible)
    }
  }

  const peutReculer = !limite || decalerMois(mois, -1) >= limite

  return (
    <div className="w-full select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMois(decalerMois(mois, -1))}
          disabled={!peutReculer}
          className="flex h-9 w-9 items-center justify-center rounded-bouton text-texte hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Mois précédent</span>
        </button>
        <p className="font-display text-base font-semibold text-texte" aria-live="polite">
          {formatMoisAnnee(mois)}
        </p>
        <button
          type="button"
          onClick={() => setMois(decalerMois(mois, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-bouton text-texte hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Mois suivant</span>
        </button>
      </div>

      <div role="grid" aria-label={libelle} ref={grilleRef} className="grid grid-cols-7 gap-1">
        {ENTETES.map((j) => (
          <div key={j} role="columnheader" className="pb-1 text-center text-xs font-medium text-texte-secondaire">
            {j}
          </div>
        ))}
        {jours.map((jour) => {
          const horsMois = jour.getMonth() !== mois.getMonth()
          const desactive = estDesactive(jour)
          const selectionne = valeur && isSameDay(jour, valeur)
          const aujourdHui = isSameDay(jour, new Date())
          const focalisable = isSameDay(jour, focus) || (!jours.some((j) => isSameDay(j, focus)) && jour.getDate() === 1 && !horsMois)
          return (
            <button
              key={jour.toISOString()}
              type="button"
              role="gridcell"
              data-date={toISODate(jour)}
              tabIndex={focalisable ? 0 : -1}
              disabled={desactive}
              aria-selected={selectionne || undefined}
              aria-current={aujourdHui ? 'date' : undefined}
              aria-label={`${formatDateLongue(jour)}${desactive ? ', indisponible' : ''}`}
              onClick={() => {
                setFocus(jour)
                onChange?.(jour)
              }}
              onKeyDown={(e) => surTouche(e, jour)}
              className={cn(
                'relative flex h-10 items-center justify-center rounded-bouton text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                horsMois && 'text-texte-secondaire/60',
                desactive && 'cursor-not-allowed text-texte-secondaire/40 line-through decoration-texte-secondaire/30',
                !desactive && !selectionne && 'text-texte hover:bg-primary-soft',
                selectionne && 'bg-primary font-semibold text-carte',
              )}
            >
              {jour.getDate()}
              {aujourdHui && !selectionne && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
