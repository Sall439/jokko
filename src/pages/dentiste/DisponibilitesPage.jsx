import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Alert'
import { ErrorState, Skeleton } from '../../components/ui/Feedback'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { disponibilitesService } from '../../services/disponibilitesService'
import { JOURS_SEMAINE, heureVersMinutes } from '../../utils/dates'
import { messageErreur } from '../../utils/errors'

const VIDE = { jour_semaine: '1', heure_debut: '08:30', heure_fin: '12:30' }

export function DisponibilitesPage() {
  useDocumentTitle('Mes disponibilités')
  const { data, loading, error, recharger, setData } = useFetch(() => disponibilitesService.lister())
  const [valeurs, setValeurs] = useState(VIDE)
  const [erreurForm, setErreurForm] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [suppression, setSuppression] = useState(null)
  const [message, setMessage] = useState(null)

  const changer = (e) => setValeurs((v) => ({ ...v, [e.target.name]: e.target.value }))

  const ajouter = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (heureVersMinutes(valeurs.heure_fin) - heureVersMinutes(valeurs.heure_debut) < 30) {
      setErreurForm("L'heure de fin doit suivre l'heure de début d'au moins 30 minutes.")
      return
    }
    setErreurForm(null)
    setEnvoi(true)
    try {
      await disponibilitesService.creer({ ...valeurs, jour_semaine: Number(valeurs.jour_semaine) })
      recharger()
      setMessage('Plage ajoutée.')
    } catch (err) {
      setErreurForm(messageErreur(err, "L'ajout a échoué."))
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async (dispo) => {
    setSuppression(dispo.id)
    setMessage(null)
    try {
      await disponibilitesService.supprimer(dispo.id)
      setData((l) => l.filter((d) => d.id !== dispo.id))
    } catch (err) {
      setErreurForm(messageErreur(err, 'La suppression a échoué.'))
    } finally {
      setSuppression(null)
    }
  }

  return (
    <>
      <PageHeader
        titre="Mes disponibilités"
        description="Vos plages de consultation hebdomadaires. Les patients ne peuvent réserver que dans ces horaires."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Card titre="Semaine type">
          {error && <ErrorState message={error} onReessayer={recharger} />}
          {loading && !data ? (
            <Skeleton className="h-64" />
          ) : (
            <ul className="flex flex-col divide-y divide-texte/[0.06]">
              {JOURS_SEMAINE.map((jour) => {
                const plages = (data ?? []).filter((d) => d.jour_semaine === jour.valeur)
                return (
                  <li key={jour.valeur} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                    <span className="w-28 shrink-0 text-sm font-semibold text-texte">{jour.label}</span>
                    {plages.length === 0 ? (
                      <span className="text-sm text-texte-secondaire">Pas de consultation</span>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {plages.map((p) => (
                          <li
                            key={p.id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-sm font-medium text-primary-dark"
                          >
                            {`${p.heure_debut} – ${p.heure_fin}`}
                            <button
                              type="button"
                              onClick={() => supprimer(p)}
                              disabled={suppression === p.id}
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-erreur/10 hover:text-erreur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-erreur disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">{`Supprimer ${jour.label} ${p.heure_debut}–${p.heure_fin}`}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card titre="Ajouter une plage">
          <form onSubmit={ajouter} className="flex flex-col gap-4">
            <Select label="Jour" name="jour_semaine" value={valeurs.jour_semaine} onChange={changer}>
              {JOURS_SEMAINE.map((j) => (
                <option key={j.valeur} value={j.valeur}>
                  {j.label}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Début" name="heure_debut" type="time" step={1800} value={valeurs.heure_debut} onChange={changer} requis />
              <Input label="Fin" name="heure_fin" type="time" step={1800} value={valeurs.heure_fin} onChange={changer} requis />
            </div>
            {erreurForm && <Alert ton="erreur">{erreurForm}</Alert>}
            {message && <Alert ton="succes">{message}</Alert>}
            <Button type="submit" chargement={envoi} pleineLargeur>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter
            </Button>
          </form>
        </Card>
      </div>
    </>
  )
}
