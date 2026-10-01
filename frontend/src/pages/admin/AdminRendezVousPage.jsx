import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { StatutActions } from '../../components/StatutActions'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rendezVousService } from '../../services/rendezVousService'
import { praticiensService } from '../../services/praticiensService'
import { formatDateCourte, formatHeure } from '../../utils/dates'
import { LISTE_STATUTS } from '../../utils/rendezVous'
import { nomComplet, nomPraticien } from '../../utils/roles'

export function AdminRendezVousPage() {
  useDocumentTitle('Rendez-vous')
  const [params, setParams] = useSearchParams()
  const filtres = {
    statut: params.get('statut') ?? '',
    praticien_id: params.get('praticien_id') ?? '',
    date: params.get('date') ?? '',
  }
  const requete = Object.fromEntries(Object.entries(filtres).filter(([, v]) => v))
  const { data, loading, error, recharger, setData } = useFetch(() => rendezVousService.lister(requete), [params.toString()])
  const praticiens = useFetch(() => praticiensService.lister())
  const [erreur, setErreur] = useState(null)

  const changerFiltre = (e) => {
    const suivants = new URLSearchParams(params)
    if (e.target.value) suivants.set(e.target.name, e.target.value)
    else suivants.delete(e.target.name)
    setParams(suivants, { replace: true })
  }

  const mettreAJour = (maj) => setData((l) => l.map((r) => (r.id === maj.id ? maj : r)))

  return (
    <>
      <PageHeader titre="Rendez-vous" description="Tous les rendez-vous du cabinet, filtrables par statut, dentiste ou date." />

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Select label="Statut" name="statut" value={filtres.statut} onChange={changerFiltre}>
            <option value="">Tous</option>
            {LISTE_STATUTS.map((s) => (
              <option key={s.valeur} value={s.valeur}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select label="Dentiste" name="praticien_id" value={filtres.praticien_id} onChange={changerFiltre}>
            <option value="">Tous</option>
            {praticiens.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {nomPraticien(p)}
              </option>
            ))}
          </Select>
          <Input label="Date" name="date" type="date" value={filtres.date} onChange={changerFiltre} />
          <Button variante="discret" onClick={() => setParams({}, { replace: true })} disabled={!params.toString()}>
            Réinitialiser
          </Button>
        </div>
      </Card>

      {erreur && (
        <Alert ton="erreur" onFermer={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}
      {error && <ErrorState message={error} onReessayer={recharger} />}

      <Card corpsClassName="p-0">
        {loading && !data ? (
          <Skeleton className="m-4 h-48" />
        ) : !data?.length ? (
          <EmptyState icone={ClipboardList} titre="Aucun rendez-vous" description="Modifiez les filtres pour élargir la recherche." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Liste des rendez-vous</caption>
              <thead className="border-b border-texte/[0.08] text-xs uppercase tracking-wide text-texte-secondaire">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Patient</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Soin</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Dentiste</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Statut</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-texte/[0.06]">
                {data.map((r) => (
                  <tr key={r.id} className="hover:bg-fond">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link to={`/admin/rendez-vous/${r.id}`} className="font-medium text-primary hover:underline">
                        {`${formatDateCourte(r.debut)} · ${formatHeure(r.debut)}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-texte">{nomComplet(r.patient)}</td>
                    <td className="px-4 py-3 text-texte-secondaire">{r.service?.nom}</td>
                    <td className="px-4 py-3 text-texte-secondaire">{nomPraticien(r.praticien)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge statut={r.statut} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <StatutActions rdv={r} onMisAJour={mettreAJour} onErreur={setErreur} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
