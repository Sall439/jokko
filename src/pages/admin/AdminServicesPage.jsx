import { useState } from 'react'
import { Pencil, Plus, Syringe, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Alert'
import { ConfirmModal, Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { soinsService } from '../../services/soinsService'
import { formatDuree } from '../../utils/dates'
import { messageErreur } from '../../utils/errors'
import { collecterErreurs, validerObligatoire } from '../../utils/validation'

const VIDE = { nom: '', duree_minutes: '30', description: '' }

export function AdminServicesPage() {
  useDocumentTitle('Services')
  const { data, loading, error, recharger } = useFetch(() => soinsService.lister())
  const [edition, setEdition] = useState(null)
  const [valeurs, setValeurs] = useState(VIDE)
  const [erreurs, setErreurs] = useState({})
  const [erreurApi, setErreurApi] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)
  const [erreurSuppr, setErreurSuppr] = useState(null)
  const [message, setMessage] = useState(null)

  const ouvrir = (soin) => {
    setEdition(soin ?? 'nouveau')
    setValeurs(soin ? { nom: soin.nom, duree_minutes: String(soin.duree_minutes), description: soin.description ?? '' } : VIDE)
    setErreurs({})
    setErreurApi(null)
  }
  const changer = (e) => setValeurs((v) => ({ ...v, [e.target.name]: e.target.value }))

  const enregistrer = async (e) => {
    e.preventDefault()
    const duree = Number(valeurs.duree_minutes)
    const nouvelles = collecterErreurs({
      nom: validerObligatoire(valeurs.nom, 'Le nom'),
      duree_minutes: !Number.isInteger(duree) || duree < 15 || duree % 15 ? 'Durée en multiples de 15 minutes.' : null,
    })
    setErreurs(nouvelles)
    if (Object.keys(nouvelles).length) return
    setEnvoi(true)
    setErreurApi(null)
    const corps = { nom: valeurs.nom.trim(), duree_minutes: duree, description: valeurs.description.trim() }
    try {
      if (edition === 'nouveau') await soinsService.creer(corps)
      else await soinsService.modifier(edition.id, corps)
      setMessage(edition === 'nouveau' ? 'Service ajouté.' : 'Service modifié.')
      setEdition(null)
      recharger()
    } catch (err) {
      setErreurApi(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async () => {
    setEnvoi(true)
    setErreurSuppr(null)
    try {
      await soinsService.supprimer(aSupprimer.id)
      setASupprimer(null)
      setMessage('Service supprimé.')
      recharger()
    } catch (err) {
      setErreurSuppr(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <>
      <PageHeader
        titre="Services"
        description="Les soins proposés à la réservation et leur durée."
        actions={
          <Button onClick={() => ouvrir(null)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un service
          </Button>
        }
      />
      {message && (
        <Alert ton="succes" onFermer={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {error && <ErrorState message={error} onReessayer={recharger} />}

      {loading && !data ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState icone={Syringe} titre="Aucun service" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((s) => (
            <li key={s.id}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-display text-base font-semibold text-texte">{s.nom}</h2>
                    <p className="text-sm font-medium text-primary">{formatDuree(s.duree_minutes)}</p>
                    {s.description && <p className="text-pretty text-sm leading-relaxed text-texte-secondaire">{s.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variante="discret" taille="icone" onClick={() => ouvrir(s)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{`Modifier ${s.nom}`}</span>
                    </Button>
                    <Button variante="dangerDiscret" taille="icone" onClick={() => setASupprimer(s)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{`Supprimer ${s.nom}`}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        ouvert={Boolean(edition)}
        onFermer={() => !envoi && setEdition(null)}
        titre={edition === 'nouveau' ? 'Nouveau service' : 'Modifier le service'}
        pied={
          <>
            <Button variante="secondaire" onClick={() => setEdition(null)} disabled={envoi}>
              Annuler
            </Button>
            <Button type="submit" form="form-service" chargement={envoi}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="form-service" onSubmit={enregistrer} noValidate className="flex flex-col gap-4">
          <Input label="Nom" name="nom" value={valeurs.nom} onChange={changer} erreur={erreurs.nom} requis data-autofocus />
          <Input
            label="Durée (minutes)"
            name="duree_minutes"
            type="number"
            min={15}
            step={15}
            value={valeurs.duree_minutes}
            onChange={changer}
            erreur={erreurs.duree_minutes}
            requis
          />
          <Textarea label="Description" name="description" rows={3} value={valeurs.description} onChange={changer} />
          {erreurApi && <Alert ton="erreur">{erreurApi}</Alert>}
        </form>
      </Modal>

      <ConfirmModal
        ouvert={Boolean(aSupprimer)}
        onFermer={() => {
          setASupprimer(null)
          setErreurSuppr(null)
        }}
        onConfirmer={supprimer}
        titre={`Supprimer « ${aSupprimer?.nom ?? ''} » ?`}
        description="Impossible si des rendez-vous à venir utilisent ce service."
        libelleConfirmer="Supprimer"
        danger
        chargement={envoi}
        erreur={erreurSuppr}
      />
    </>
  )
}
