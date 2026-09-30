import { Clock, Stethoscope, UserRound } from 'lucide-react'
import { StatusBadge } from './ui/Badge'
import { cn } from '../utils/cn'
import { formatDuree, formatHeure } from '../utils/dates'
import { nomComplet, nomPraticien } from '../utils/roles'

const MOIS_COURT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const JOUR_COURT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })

// Pavé date façon « ticket » : repère visuel commun à toutes les listes.
export function DateTicket({ date, className }) {
  const d = new Date(date)
  return (
    <div
      className={cn(
        'flex w-16 shrink-0 flex-col items-center justify-center rounded-bouton border border-primary/15 bg-primary-soft py-2 text-primary-dark',
        className,
      )}
      aria-hidden="true"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide">{JOUR_COURT.format(d).replace('.', '')}</span>
      <span className="font-display text-2xl font-bold leading-none">{d.getDate()}</span>
      <span className="text-[11px] font-medium uppercase">{MOIS_COURT.format(d).replace('.', '')}</span>
    </div>
  )
}

// Carte d'un rendez-vous. `afficher` choisit l'interlocuteur montré
// (le dentiste pour un patient, le patient pour un dentiste).
export function AppointmentCard({ rdv, afficher = 'praticien', actions, pied, className }) {
  return (
    <article className={cn('flex flex-col gap-4 rounded-carte border border-texte/[0.06] bg-carte p-4 shadow-carte', className)}>
      <div className="flex gap-4">
        <DateTicket date={rdv.debut} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-texte">{rdv.service?.nom ?? 'Rendez-vous'}</h3>
            <StatusBadge statut={rdv.statut} />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-texte-secondaire">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <time dateTime={rdv.debut}>{formatHeure(rdv.debut)}</time>
              {' – '}
              <time dateTime={rdv.fin}>{formatHeure(rdv.fin)}</time>
              {rdv.service && ` · ${formatDuree(rdv.service.duree_minutes)}`}
            </span>
          </p>
          {afficher === 'praticien' && rdv.praticien && (
            <p className="flex items-center gap-1.5 text-sm text-texte-secondaire">
              <Stethoscope className="h-4 w-4 shrink-0" aria-hidden="true" />
              {nomPraticien(rdv.praticien)}
              <span className="hidden sm:inline">{` · ${rdv.praticien.specialite}`}</span>
            </p>
          )}
          {afficher === 'patient' && rdv.patient && (
            <p className="flex items-center gap-1.5 text-sm text-texte-secondaire">
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              {nomComplet(rdv.patient)}
            </p>
          )}
          {afficher === 'tous' && (
            <p className="text-sm text-texte-secondaire">
              {nomComplet(rdv.patient)} · {nomPraticien(rdv.praticien)}
            </p>
          )}
          {rdv.motif && <p className="text-pretty text-sm italic text-texte-secondaire">{`« ${rdv.motif} »`}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap justify-end gap-2 border-t border-texte/[0.06] pt-3">{actions}</div>}
      {pied}
    </article>
  )
}
