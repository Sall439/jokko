import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Clock } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Alert'
import { ErrorState, Loader, Skeleton } from '../../components/ui/Feedback'
import { Calendar } from '../../components/Calendar'
import { SlotPicker } from '../../components/SlotPicker'
import { RetourLien } from '../../components/RetourLien'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { soinsService } from '../../services/soinsService'
import { praticiensService } from '../../services/praticiensService'
import { rendezVousService } from '../../services/rendezVousService'
import { formatDateHeure, formatDateLongue, formatDuree, isPastDay, jourIso, startOfDay, toISODate } from '../../utils/dates'
import { messageErreur } from '../../utils/errors'
import { peutModifier } from '../../utils/rendezVous'
import { initiales, nomPraticien } from '../../utils/roles'
import { cn } from '../../utils/cn'

const MOTIF_MAX = 300

function Choix({ selectionne, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selectionne}
      className={cn(
        'flex w-full items-center gap-3 rounded-carte border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selectionne ? 'border-primary bg-primary-soft' : 'border-texte/[0.1] bg-carte hover:border-primary/50',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</span>
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
          selectionne ? 'border-primary bg-primary text-carte' : 'border-texte/20',
        )}
        aria-hidden="true"
      >
        {selectionne && <Check className="h-3 w-3" />}
      </span>
    </button>
  )
}

function Etape({ numero, titre, children, actif = true }) {
  return (
    <Card
      titre={
        <span className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
              actif ? 'bg-primary text-carte' : 'bg-texte/[0.07] text-texte-secondaire',
            )}
            aria-hidden="true"
          >
            {numero}
          </span>
          {titre}
        </span>
      }
      className={cn(!actif && 'opacity-60')}
    >
      {actif ? children : <p className="text-sm text-texte-secondaire">Complétez l&apos;étape précédente.</p>}
    </Card>
  )
}

export function ReservationPage() {
  const { id } = useParams()
  const modeEdition = Boolean(id)
  useDocumentTitle(modeEdition ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous')
  const navigate = useNavigate()

  const soins = useFetch(() => soinsService.lister())
  const praticiens = useFetch(() => praticiensService.lister())
  const existant = useFetch(() => rendezVousService.obtenir(id), [id], { actif: modeEdition })

  const [serviceId, setServiceId] = useState(null)
  const [praticienId, setPraticienId] = useState(null)
  const [date, setDate] = useState(null)
  const [debut, setDebut] = useState(null)
  const [motif, setMotif] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  // Pré-remplissage en mode modification.
  useEffect(() => {
    const rdv = existant.data
    if (!rdv) return
    setServiceId(rdv.service_id)
    setPraticienId(rdv.praticien_id)
    setDate(startOfDay(new Date(rdv.debut)))
    setDebut(rdv.debut)
    setMotif(rdv.motif ?? '')
  }, [existant.data])

  const pretPourCreneaux = Boolean(serviceId && praticienId && date)
  const creneaux = useFetch(
    () => praticiensService.creneaux(praticienId, { date: toISODate(date), serviceId, exclureRdv: modeEdition ? id : undefined }),
    [praticienId, serviceId, date?.getTime()],
    { actif: pretPourCreneaux },
  )

  const soin = soins.data?.find((s) => s.id === serviceId)
  const praticien = praticiens.data?.find((p) => p.id === praticienId)

  const choisirService = (valeur) => {
    setServiceId(valeur)
    setDebut(null)
  }
  const choisirPraticien = (valeur) => {
    setPraticienId(valeur)
    setDebut(null)
    if (date && valeur) {
      const p = praticiens.data?.find((x) => x.id === valeur)
      if (p?.jours_consultation?.length && !p.jours_consultation.includes(jourIso(date))) setDate(null)
    }
  }
  const choisirDate = (valeur) => {
    setDate(valeur)
    setDebut(null)
  }

  const jourDesactive = (jour) =>
    isPastDay(jour) || Boolean(praticien?.jours_consultation?.length && !praticien.jours_consultation.includes(jourIso(jour)))

  const soumettre = async (e) => {
    e.preventDefault()
    if (!debut) return
    setEnvoi(true)
    setErreur(null)
    const corps = { service_id: serviceId, praticien_id: praticienId, debut, motif: motif.trim() }
    try {
      if (modeEdition) await rendezVousService.modifier(id, corps)
      else await rendezVousService.creer(corps)
      navigate('/patient/rendez-vous', {
        state: {
          message: modeEdition
            ? 'Rendez-vous modifié. Il repasse en attente de confirmation par le cabinet.'
            : 'Demande envoyée ! Le cabinet va confirmer votre rendez-vous.',
        },
      })
    } catch (err) {
      setErreur(messageErreur(err, 'La réservation a échoué.'))
      setEnvoi(false)
      if (err?.response?.status === 409) {
        setDebut(null)
        creneaux.recharger()
      }
    }
  }

  if (modeEdition && existant.loading) return <Loader label="Chargement du rendez-vous…" />
  if (modeEdition && existant.error) return <ErrorState message={existant.error} onReessayer={existant.recharger} />
  if (modeEdition && existant.data && !peutModifier(existant.data).autorise) {
    return (
      <>
        <PageHeader titre="Modifier le rendez-vous" retour={<RetourLien vers="/patient/rendez-vous">Mes rendez-vous</RetourLien>} />
        <Alert ton="attention">{peutModifier(existant.data).raison}</Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader
        titre={modeEdition ? 'Modifier le rendez-vous' : 'Prendre rendez-vous'}
        description={
          modeEdition && existant.data
            ? `Actuellement : ${formatDateHeure(existant.data.debut)}`
            : 'Quatre étapes, et votre demande part au cabinet.'
        }
        retour={modeEdition && <RetourLien vers="/patient/rendez-vous">Mes rendez-vous</RetourLien>}
      />

      <form onSubmit={soumettre} className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Etape numero={1} titre="Quel soin ?">
            {soins.error && <ErrorState message={soins.error} onReessayer={soins.recharger} />}
            <div className="grid gap-3 sm:grid-cols-2">
              {soins.loading && <Skeleton className="h-16" />}
              {soins.data?.map((s) => (
                <Choix key={s.id} selectionne={serviceId === s.id} onClick={() => choisirService(s.id)}>
                  <span className="font-semibold text-texte">{s.nom}</span>
                  <span className="flex items-center gap-1 text-sm text-texte-secondaire">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDuree(s.duree_minutes)}
                  </span>
                </Choix>
              ))}
            </div>
          </Etape>

          <Etape numero={2} titre="Avec quel dentiste ?" actif={Boolean(serviceId)}>
            {praticiens.error && <ErrorState message={praticiens.error} onReessayer={praticiens.recharger} />}
            <div className="grid gap-3 sm:grid-cols-2">
              {praticiens.data?.map((p) => (
                <Choix key={p.id} selectionne={praticienId === p.id} onClick={() => choisirPraticien(p.id)}>
                  <span className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-carte"
                      aria-hidden="true"
                    >
                      {initiales(p)}
                    </span>
                    <span className="flex flex-col">
                      <span className="font-semibold text-texte">{nomPraticien(p)}</span>
                      <span className="text-sm text-texte-secondaire">{p.specialite}</span>
                    </span>
                  </span>
                </Choix>
              ))}
            </div>
          </Etape>

          <Etape numero={3} titre="Quel jour et à quelle heure ?" actif={Boolean(serviceId && praticienId)}>
            <div className="grid gap-6 md:grid-cols-2">
              <Calendar valeur={date} onChange={choisirDate} estDesactive={jourDesactive} moisMin={new Date()} libelle="Date du rendez-vous" />
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-texte">{date ? formatDateLongue(date) : 'Choisissez une date'}</p>
                {creneaux.error && <ErrorState message={creneaux.error} onReessayer={creneaux.recharger} />}
                {date && (
                  <SlotPicker
                    creneaux={creneaux.data ?? []}
                    valeur={debut}
                    onChange={setDebut}
                    chargement={creneaux.loading}
                    messageVide="Aucun créneau ce jour-là. Essayez une autre date."
                  />
                )}
              </div>
            </div>
          </Etape>

          <Etape numero={4} titre="Un message pour le dentiste ?" actif={Boolean(debut)}>
            <Textarea
              label="Motif (facultatif)"
              value={motif}
              onChange={(e) => setMotif(e.target.value.slice(0, MOTIF_MAX))}
              rows={3}
              aide={`${motif.length}/${MOTIF_MAX} caractères`}
              placeholder="Ex. douleur en bas à gauche depuis quelques jours"
            />
          </Etape>
        </div>

        <aside className="lg:sticky lg:top-6">
          <Card titre="Récapitulatif">
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-texte-secondaire">Soin</dt>
                <dd className="text-right font-medium text-texte">{soin?.nom ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-texte-secondaire">Dentiste</dt>
                <dd className="text-right font-medium text-texte">{praticien ? nomPraticien(praticien) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-texte-secondaire">Date</dt>
                <dd className="text-right font-medium text-texte">{debut ? formatDateHeure(debut) : '—'}</dd>
              </div>
              {soin && (
                <div className="flex justify-between gap-3">
                  <dt className="text-texte-secondaire">Durée</dt>
                  <dd className="text-right font-medium text-texte">{formatDuree(soin.duree_minutes)}</dd>
                </div>
              )}
            </dl>
            {erreur && (
              <Alert ton="erreur" className="mt-4">
                {erreur}
              </Alert>
            )}
            <Button type="submit" pleineLargeur taille="lg" className="mt-5" disabled={!debut} chargement={envoi}>
              {modeEdition ? 'Enregistrer la modification' : 'Envoyer la demande'}
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-texte-secondaire">
              Annulation ou modification gratuite jusqu&apos;à 24 h avant le rendez-vous.
            </p>
          </Card>
        </aside>
      </form>
    </>
  )
}
