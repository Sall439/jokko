import { useState } from 'react'
import { CalendarPlus, CalendarX2, Pencil } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { AppointmentCard } from '../../components/AppointmentCard'
import { AnnulationModal } from '../../components/AnnulationModal'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rendezVousService } from '../../services/rendezVousService'
import { estActif, peutAnnuler, peutModifier } from '../../utils/rendezVous'

export function ActionsPatient({ rdv, onAnnuler }) {
  const modif = peutModifier(rdv)
  const annul = peutAnnuler(rdv)
  if (!estActif(rdv)) return null
  if (!modif.autorise && !annul.autorise) {
    return <p className="mr-auto text-xs leading-relaxed text-texte-secondaire">{annul.raison}</p>
  }
  return (
    <>
      {modif.autorise && (
        <ButtonLink to={`/patient/rendez-vous/${rdv.id}/modifier`} variante="discret" taille="sm">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Modifier
        </ButtonLink>
      )}
      {annul.autorise && (
        <Button variante="dangerDiscret" taille="sm" onClick={() => onAnnuler(rdv)}>
          <CalendarX2 className="h-4 w-4" aria-hidden="true" />
          Annuler
        </Button>
      )}
    </>
  )
}

export function PatientDashboard() {
  useDocumentTitle('Tableau de bord')
  const { utilisateur } = useAuth()
  const { data, loading, error, recharger, setData } = useFetch(() => rendezVousService.lister())
  const [aAnnuler, setAAnnuler] = useState(null)
  const [message, setMessage] = useState(null)

  const maintenant = new Date()
  const aVenir = (data ?? []).filter((r) => estActif(r) && new Date(r.debut) > maintenant)
  const prochain = aVenir[0]
  const suivants = aVenir.slice(1, 4)

  return (
    <>
      <PageHeader
        titre={`Bonjour ${utilisateur?.prenom ?? ''}`}
        description="Retrouvez ici votre prochain rendez-vous au cabinet."
        actions={
          <ButtonLink to="/patient/nouveau-rendez-vous">
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Nouveau rendez-vous
          </ButtonLink>
        }
      />

      {message && (
        <Alert ton="succes" onFermer={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {error && <ErrorState message={error} onReessayer={recharger} />}

      <Card titre="Prochain rendez-vous">
        {loading && !data ? (
          <Skeleton className="h-28" />
        ) : prochain ? (
          <AppointmentCard
            rdv={prochain}
            className="border-primary/20 shadow-none"
            actions={<ActionsPatient rdv={prochain} onAnnuler={setAAnnuler} />}
          />
        ) : (
          <EmptyState
            icone={CalendarPlus}
            titre="Aucun rendez-vous prévu"
            description="Réservez un créneau en quelques clics."
            action={<ButtonLink to="/patient/nouveau-rendez-vous">Prendre rendez-vous</ButtonLink>}
          />
        )}
      </Card>

      {suivants.length > 0 && (
        <Card
          titre="Ensuite"
          action={
            <ButtonLink to="/patient/rendez-vous" variante="discret" taille="sm">
              Tout voir
            </ButtonLink>
          }
        >
          <ul className="flex flex-col gap-3">
            {suivants.map((rdv) => (
              <li key={rdv.id}>
                <AppointmentCard rdv={rdv} className="shadow-none" actions={<ActionsPatient rdv={rdv} onAnnuler={setAAnnuler} />} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AnnulationModal
        rdv={aAnnuler}
        onFermer={() => setAAnnuler(null)}
        onAnnule={(maj) => {
          setData((liste) => liste.map((r) => (r.id === maj.id ? maj : r)))
          setMessage('Votre rendez-vous a bien été annulé.')
        }}
      />
    </>
  )
}
