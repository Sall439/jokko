import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Hourglass } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { AppointmentCard } from '../../components/AppointmentCard'
import { StatutActions } from '../../components/StatutActions'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rendezVousService } from '../../services/rendezVousService'
import { addDays, formatDateCourte, formatDateLongue, isSameDay, startOfWeek, toISODate } from '../../utils/dates'
import { cn } from '../../utils/cn'

export function AgendaPage() {
  useDocumentTitle('Mon agenda')
  const { utilisateur } = useAuth()
  const [semaine, setSemaine] = useState(() => startOfWeek(new Date()))
  const [erreur, setErreur] = useState(null)
  const fin = addDays(semaine, 6)

  const { data, loading, error, recharger, setData } = useFetch(
    () => rendezVousService.lister({ du: toISODate(semaine), au: toISODate(fin) }),
    [semaine.getTime()],
  )
  const enAttente = useFetch(() => rendezVousService.lister({ statut: 'en_attente' }))

  const jours = Array.from({ length: 7 }, (_, i) => addDays(semaine, i))
  const visibles = (data ?? []).filter((r) => r.statut !== 'annule')
  const aujourdhui = new Date()
  const demandesFutures = (enAttente.data ?? []).filter((r) => new Date(r.debut) > aujourdhui)

  const mettreAJour = (maj) => {
    setData((l) => l?.map((r) => (r.id === maj.id ? maj : r)))
    enAttente.recharger()
  }

  return (
    <>
      <PageHeader
        titre={`Bonjour Dr ${utilisateur?.nom ?? ''}`}
        description="Votre semaine de consultations et les demandes à valider."
      />

      {erreur && (
        <Alert ton="erreur" onFermer={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {demandesFutures.length > 0 && (
        <section aria-labelledby="titre-demandes" className="flex flex-col gap-3 rounded-carte border border-attention/30 bg-attention/[0.06] p-4">
          <h2 id="titre-demandes" className="flex items-center gap-2 font-display text-h3 text-texte">
            <Hourglass className="h-5 w-5 text-attention" aria-hidden="true" />
            {`Demandes à confirmer (${demandesFutures.length})`}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {demandesFutures.map((rdv) => (
              <li key={rdv.id}>
                <AppointmentCard
                  rdv={rdv}
                  afficher="patient"
                  className="h-full"
                  actions={<StatutActions rdv={rdv} onMisAJour={mettreAJour} onErreur={setErreur} />}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titre-semaine" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titre-semaine" className="font-display text-h3 text-texte">
            {`Semaine du ${formatDateCourte(semaine)} au ${formatDateCourte(fin)}`}
          </h2>
          <div className="flex items-center gap-1">
            <Button variante="discret" taille="icone" onClick={() => setSemaine((s) => addDays(s, -7))}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Semaine précédente</span>
            </Button>
            <Button variante="secondaire" taille="sm" onClick={() => setSemaine(startOfWeek(new Date()))}>
              Aujourd&apos;hui
            </Button>
            <Button variante="discret" taille="icone" onClick={() => setSemaine((s) => addDays(s, 7))}>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Semaine suivante</span>
            </Button>
          </div>
        </div>

        {error && <ErrorState message={error} onReessayer={recharger} />}

        {loading && !data ? (
          <Skeleton className="h-64" />
        ) : visibles.length === 0 ? (
          <EmptyState icone={CalendarDays} titre="Aucun rendez-vous cette semaine" />
        ) : (
          <ol className="flex flex-col gap-5">
            {jours.map((jour) => {
              const duJour = visibles.filter((r) => isSameDay(r.debut, jour))
              if (!duJour.length) return null
              const estAujourdhui = isSameDay(jour, aujourdhui)
              return (
                <li key={jour.toISOString()} className="flex flex-col gap-2">
                  <h3 className={cn('flex items-center gap-2 text-sm font-semibold', estAujourdhui ? 'text-primary' : 'text-texte')}>
                    {formatDateLongue(jour)}
                    {estAujourdhui && <Badge ton="primaire">{"Aujourd'hui"}</Badge>}
                    <span className="font-normal text-texte-secondaire">{`· ${duJour.length} rdv`}</span>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {duJour.map((rdv) => (
                      <li key={rdv.id}>
                        <AppointmentCard
                          rdv={rdv}
                          afficher="patient"
                          actions={
                            <>
                              <Link
                                to={`/dentiste/rendez-vous/${rdv.id}`}
                                className="mr-auto self-center text-sm font-medium text-primary hover:underline"
                              >
                                Voir le détail
                              </Link>
                              <StatutActions rdv={rdv} onMisAJour={mettreAJour} onErreur={setErreur} />
                            </>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </>
  )
}
