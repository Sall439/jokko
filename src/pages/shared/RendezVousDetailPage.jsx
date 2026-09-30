import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Alert } from '../../components/ui/Alert'
import { StatusBadge } from '../../components/ui/Badge'
import { ErrorState, Loader } from '../../components/ui/Feedback'
import { RetourLien } from '../../components/RetourLien'
import { StatutActions } from '../../components/StatutActions'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rendezVousService } from '../../services/rendezVousService'
import { formatDateHeure, formatDateLongue, formatDuree, formatHeure } from '../../utils/dates'
import { nomComplet, nomPraticien } from '../../utils/roles'

function Ligne({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-texte-secondaire">{label}</dt>
      <dd className="text-sm font-medium text-texte sm:text-right">{children}</dd>
    </div>
  )
}

export function RendezVousDetailPage() {
  useDocumentTitle('Détail du rendez-vous')
  const { id } = useParams()
  const { utilisateur } = useAuth()
  const { data: rdv, loading, error, recharger, setData } = useFetch(() => rendezVousService.obtenir(id), [id])
  const [erreur, setErreur] = useState(null)
  const retour = utilisateur?.role === 'admin' ? { vers: '/admin/rendez-vous', label: 'Tous les rendez-vous' } : { vers: '/dentiste', label: 'Mon agenda' }

  if (loading && !rdv) return <Loader />
  if (error) return <ErrorState message={error} onReessayer={recharger} />
  if (!rdv) return null

  return (
    <>
      <PageHeader
        titre={rdv.service?.nom ?? 'Rendez-vous'}
        description={`${formatDateLongue(rdv.debut)} · ${formatHeure(rdv.debut)} – ${formatHeure(rdv.fin)}`}
        retour={<RetourLien vers={retour.vers}>{retour.label}</RetourLien>}
        actions={<StatutActions rdv={rdv} taille="md" onMisAJour={setData} onErreur={setErreur} />}
      />
      {erreur && (
        <Alert ton="erreur" onFermer={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Card titre="Rendez-vous">
          <dl className="flex flex-col gap-3">
            <Ligne label="Statut">
              <StatusBadge statut={rdv.statut} />
            </Ligne>
            <Ligne label="Soin">{rdv.service?.nom}</Ligne>
            <Ligne label="Durée">{rdv.service ? formatDuree(rdv.service.duree_minutes) : '—'}</Ligne>
            <Ligne label="Dentiste">{nomPraticien(rdv.praticien)}</Ligne>
            {rdv.cree_le && <Ligne label="Demandé le">{formatDateHeure(rdv.cree_le)}</Ligne>}
          </dl>
          {rdv.motif && (
            <div className="mt-4 rounded-bouton bg-fond p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-texte-secondaire">Motif</p>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-texte">{rdv.motif}</p>
            </div>
          )}
        </Card>
        <Card titre="Patient">
          <dl className="flex flex-col gap-3">
            <Ligne label="Nom">{nomComplet(rdv.patient)}</Ligne>
            <Ligne label="Téléphone">
              {rdv.patient?.telephone ? (
                <a href={`tel:${rdv.patient.telephone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {rdv.patient.telephone}
                </a>
              ) : (
                '—'
              )}
            </Ligne>
            <Ligne label="E-mail">
              {rdv.patient?.email ? (
                <a href={`mailto:${rdv.patient.email}`} className="inline-flex items-center gap-1.5 break-all text-primary hover:underline">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {rdv.patient.email}
                </a>
              ) : (
                '—'
              )}
            </Ligne>
          </dl>
        </Card>
      </div>
    </>
  )
}
