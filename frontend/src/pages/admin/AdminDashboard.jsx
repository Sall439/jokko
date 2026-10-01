import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { ButtonLink } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rendezVousService } from '../../services/rendezVousService'
import { praticiensService } from '../../services/praticiensService'
import { formatHeure, isSameDay } from '../../utils/dates'
import { nomComplet, nomPraticien } from '../../utils/roles'
import { CalendarCheck } from 'lucide-react'

function Indicateur({ label, valeur, vers }) {
  return (
    <Link
      to={vers}
      className="flex flex-col gap-1 rounded-carte border border-texte/[0.06] bg-carte p-4 shadow-carte transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="text-sm text-texte-secondaire">{label}</span>
      <span className="font-display text-3xl font-bold text-texte">{valeur}</span>
    </Link>
  )
}

export function AdminDashboard() {
  useDocumentTitle('Administration')
  const rdv = useFetch(() => rendezVousService.lister())
  const praticiens = useFetch(() => praticiensService.lister())

  const maintenant = new Date()
  const liste = rdv.data ?? []
  const duJour = liste.filter((r) => isSameDay(r.debut, maintenant) && r.statut !== 'annule')
  const enAttente = liste.filter((r) => r.statut === 'en_attente' && new Date(r.debut) > maintenant)
  const aVenir = liste.filter((r) => r.statut === 'confirme' && new Date(r.debut) > maintenant)

  return (
    <>
      <PageHeader titre="Tableau de bord" description="Vue d'ensemble de l'activité du cabinet." />
      {rdv.error && <ErrorState message={rdv.error} onReessayer={rdv.recharger} />}

      {rdv.loading && !rdv.data ? (
        <Skeleton className="h-24" />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicateur label="Aujourd'hui" valeur={duJour.length} vers="/admin/rendez-vous" />
          <Indicateur label="À confirmer" valeur={enAttente.length} vers="/admin/rendez-vous?statut=en_attente" />
          <Indicateur label="Confirmés à venir" valeur={aVenir.length} vers="/admin/rendez-vous?statut=confirme" />
          <Indicateur label="Dentistes" valeur={praticiens.data?.length ?? '–'} vers="/admin/dentistes" />
        </div>
      )}

      <Card
        titre="Rendez-vous du jour"
        action={
          <ButtonLink to="/admin/rendez-vous" variante="discret" taille="sm">
            Tout voir
          </ButtonLink>
        }
      >
        {duJour.length === 0 ? (
          <EmptyState icone={CalendarCheck} titre="Aucun rendez-vous aujourd'hui" />
        ) : (
          <ul className="flex flex-col divide-y divide-texte/[0.06]">
            {duJour.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/admin/rendez-vous/${r.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="w-14 font-display font-semibold text-texte">{formatHeure(r.debut)}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium text-texte">{nomComplet(r.patient)}</span>
                    <span className="text-texte-secondaire">{` · ${r.service?.nom} · ${nomPraticien(r.praticien)}`}</span>
                  </span>
                  <StatusBadge statut={r.statut} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
