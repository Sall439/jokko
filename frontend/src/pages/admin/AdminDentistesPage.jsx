import { useState } from 'react'
import { Mail, Pencil, Phone, Plus, Stethoscope, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Alert'
import { ConfirmModal, Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { praticiensService } from '../../services/praticiensService'
import { libelleJour } from '../../utils/dates'
import { messageErreur } from '../../utils/errors'
import { initiales, nomPraticien } from '../../utils/roles'
import { collecterErreurs, validerEmail, validerMotDePasse, validerObligatoire, validerTelephone } from '../../utils/validation'

const VIDE = { prenom: '', nom: '', email: '', telephone: '', specialite: 'Chirurgien-dentiste', mot_de_passe: '' }

export function AdminDentistesPage() {
  useDocumentTitle('Dentistes')
  const { data, loading, error, recharger } = useFetch(() => praticiensService.lister())
  const [edition, setEdition] = useState(null)
  const [valeurs, setValeurs] = useState(VIDE)
  const [erreurs, setErreurs] = useState({})
  const [erreurApi, setErreurApi] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)
  const [erreurSuppr, setErreurSuppr] = useState(null)
  const [message, setMessage] = useState(null)
  const creation = edition === 'nouveau'

  const ouvrir = (p) => {
    setEdition(p ?? 'nouveau')
    setValeurs(p ? { prenom: p.prenom, nom: p.nom, email: p.email, telephone: p.telephone, specialite: p.specialite, mot_de_passe: '' } : VIDE)
    setErreurs({})
    setErreurApi(null)
  }
  const changer = (e) => setValeurs((v) => ({ ...v, [e.target.name]: e.target.value }))

  const enregistrer = async (e) => {
    e.preventDefault()
    const nouvelles = collecterErreurs({
      prenom: validerObligatoire(valeurs.prenom, 'Le prénom'),
      nom: validerObligatoire(valeurs.nom, 'Le nom'),
      email: creation ? validerEmail(valeurs.email) : null,
      telephone: validerTelephone(valeurs.telephone),
      specialite: validerObligatoire(valeurs.specialite, 'La spécialité'),
      mot_de_passe: creation ? validerMotDePasse(valeurs.mot_de_passe) : null,
    })
    setErreurs(nouvelles)
    if (Object.keys(nouvelles).length) return
    setEnvoi(true)
    setErreurApi(null)
    try {
      if (creation) await praticiensService.creer(valeurs)
      else {
        const { prenom, nom, telephone, specialite } = valeurs
        await praticiensService.modifier(edition.id, { prenom, nom, telephone, specialite })
      }
      setMessage(creation ? 'Dentiste ajouté. Il peut se connecter avec ses identifiants.' : 'Fiche mise à jour.')
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
      await praticiensService.supprimer(aSupprimer.id)
      setASupprimer(null)
      setMessage('Dentiste supprimé.')
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
        titre="Dentistes"
        description="L'équipe soignante et ses jours de consultation."
        actions={
          <Button onClick={() => ouvrir(null)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un dentiste
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
        <EmptyState icone={Stethoscope} titre="Aucun dentiste" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((p) => (
            <li key={p.id}>
              <Card className="h-full">
                <div className="flex gap-4">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-carte"
                    aria-hidden="true"
                  >
                    {initiales(p)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 className="font-display text-base font-semibold text-texte">{nomPraticien(p)}</h2>
                    <p className="text-sm text-texte-secondaire">{p.specialite}</p>
                    <p className="flex items-center gap-1.5 break-all text-sm text-texte-secondaire">
                      <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {p.email}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-texte-secondaire">
                      <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {p.telephone}
                    </p>
                    <p className="mt-1 text-xs text-texte-secondaire">
                      {p.jours_consultation?.length
                        ? `Consulte : ${p.jours_consultation.map((j) => libelleJour(j)).join(', ')}`
                        : 'Aucune disponibilité définie'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button variante="discret" taille="icone" onClick={() => ouvrir(p)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{`Modifier ${nomPraticien(p)}`}</span>
                    </Button>
                    <Button variante="dangerDiscret" taille="icone" onClick={() => setASupprimer(p)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{`Supprimer ${nomPraticien(p)}`}</span>
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
        titre={creation ? 'Nouveau dentiste' : 'Modifier la fiche'}
        description={creation ? 'Un compte dentiste sera créé avec ces identifiants.' : undefined}
        pied={
          <>
            <Button variante="secondaire" onClick={() => setEdition(null)} disabled={envoi}>
              Annuler
            </Button>
            <Button type="submit" form="form-dentiste" chargement={envoi}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="form-dentiste" onSubmit={enregistrer} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Prénom" name="prenom" value={valeurs.prenom} onChange={changer} erreur={erreurs.prenom} requis data-autofocus />
            <Input label="Nom" name="nom" value={valeurs.nom} onChange={changer} erreur={erreurs.nom} requis />
          </div>
          <Input label="Spécialité" name="specialite" value={valeurs.specialite} onChange={changer} erreur={erreurs.specialite} requis />
          <Input
            label="E-mail"
            name="email"
            type="email"
            value={valeurs.email}
            onChange={changer}
            erreur={erreurs.email}
            disabled={!creation}
            requis={creation}
          />
          <Input label="Téléphone" name="telephone" type="tel" value={valeurs.telephone} onChange={changer} erreur={erreurs.telephone} requis />
          {creation && (
            <Input
              label="Mot de passe provisoire"
              name="mot_de_passe"
              type="password"
              autoComplete="new-password"
              value={valeurs.mot_de_passe}
              onChange={changer}
              erreur={erreurs.mot_de_passe}
              requis
            />
          )}
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
        titre={`Supprimer ${aSupprimer ? nomPraticien(aSupprimer) : ''} ?`}
        description="Son compte et ses disponibilités seront supprimés. Impossible s'il a des rendez-vous à venir."
        libelleConfirmer="Supprimer"
        danger
        chargement={envoi}
        erreur={erreurSuppr}
      />
    </>
  )
}
