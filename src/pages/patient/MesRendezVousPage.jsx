import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarPlus, ClipboardList } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { ButtonLink } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { AppointmentCard } from '../../components/AppointmentCard'
import { AnnulationModal } from '../../components/AnnulationModal'
import { ActionsPatient } from './PatientDashboard'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rendezVousService } from '../../services/rendezVousService'
import { estActif } from '../../utils/rendezVous'
import { cn } from '../../utils/cn'

const ONGLETS = [
  { id: 'avenir', label: 'À venir' },
  { id: 'passes', label: 'Historique' },
]

export function MesRendezVousPage() {
  useDocumentTitle('Mes rendez-vous')
  const location = useLocation()
  const navigate = useNavigate()
  const { data, loading, error, recharger, setData } = useFetch(() => rendezVousService.lister())
  const [onglet, setOnglet] = useState('avenir')
  const [aAnnuler, setAAnnuler] = useState(null)
  const [message, setMessage] = useState(location.state?.message ?? null)

  const maintenant = new Date()
  const estAVenir = (r) => estActif(r) && new Date(r.debut) > maintenant
  const liste = (data ?? []).filter((r) => (onglet === 'avenir' ? estAVenir(r) : !estAVenir(r)))
  if (onglet === 'passes') liste.reverse()

  const fermerMessage = () => {
    setMessage(null)
    navigate(location.pathname, { replace: true, state: null })
  }

  return (
    <>
      <PageHeader
        titre="Mes rendez-vous"
        description="Vous pouvez modifier ou annuler un rendez-vous jusqu'à 24 h avant."
        actions={
          <ButtonLink to="/patient/nouveau-rendez-vous">
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Nouveau
          </ButtonLink>
        }
      />

      {message && (
        <Alert ton="succes" onFermer={fermerMessage}>
          {message}
        </Alert>
      )}

      <div role="tablist" aria-label="Période" className="flex w-fit gap-1 rounded-bouton bg-texte/[0.05] p-1">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={cn(
              'h-9 rounded-bouton px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              onglet === o.id ? 'bg-carte text-primary-dark shadow-carte' : 'text-texte-secondaire hover:text-texte',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onReessayer={recharger} />}

      <div role="tabpanel">
        {loading && !data ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : liste.length === 0 ? (
          <EmptyState
            icone={ClipboardList}
            titre={onglet === 'avenir' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
            action={onglet === 'avenir' && <ButtonLink to="/patient/nouveau-rendez-vous">Prendre rendez-vous</ButtonLink>}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {liste.map((rdv) => (
              <li key={rdv.id}>
                <AppointmentCard
                  rdv={rdv}
                  className="h-full"
                  actions={onglet === 'avenir' ? <ActionsPatient rdv={rdv} onAnnuler={setAAnnuler} /> : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnnulationModal
        rdv={aAnnuler}
        onFermer={() => setAAnnuler(null)}
        onAnnule={(maj) => {
          setData((l) => l.map((r) => (r.id === maj.id ? maj : r)))
          setMessage('Votre rendez-vous a bien été annulé.')
        }}
      />
    </>
  )
}
