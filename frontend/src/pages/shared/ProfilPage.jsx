import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { messageErreur } from '../../utils/errors'
import { ROLES, initiales, nomComplet } from '../../utils/roles'
import { collecterErreurs, validerObligatoire, validerTelephone } from '../../utils/validation'

export function ProfilPage() {
  useDocumentTitle('Mon profil')
  const { utilisateur, mettreAJourProfil } = useAuth()
  const [valeurs, setValeurs] = useState({
    prenom: utilisateur?.prenom ?? '',
    nom: utilisateur?.nom ?? '',
    telephone: utilisateur?.telephone ?? '',
  })
  const [erreurs, setErreurs] = useState({})
  const [statut, setStatut] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  const changer = (e) => {
    setValeurs((v) => ({ ...v, [e.target.name]: e.target.value }))
    setStatut(null)
  }

  const soumettre = async (e) => {
    e.preventDefault()
    const nouvelles = collecterErreurs({
      prenom: validerObligatoire(valeurs.prenom, 'Le prénom'),
      nom: validerObligatoire(valeurs.nom, 'Le nom'),
      telephone: validerTelephone(valeurs.telephone),
    })
    setErreurs(nouvelles)
    if (Object.keys(nouvelles).length) return
    setEnvoi(true)
    try {
      await mettreAJourProfil({ prenom: valeurs.prenom.trim(), nom: valeurs.nom.trim(), telephone: valeurs.telephone.trim() })
      setStatut({ ton: 'succes', texte: 'Profil mis à jour.' })
    } catch (err) {
      setStatut({ ton: 'erreur', texte: messageErreur(err, 'La mise à jour a échoué.') })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <>
      <PageHeader titre="Mon profil" description="Ces coordonnées permettent au cabinet de vous joindre." />
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
        <Card>
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary font-display text-2xl font-semibold text-carte" aria-hidden="true">
              {initiales(utilisateur)}
            </span>
            <div>
              <p className="font-display text-h3 text-texte">{nomComplet(utilisateur)}</p>
              <p className="break-all text-sm text-texte-secondaire">{utilisateur?.email}</p>
            </div>
            <Badge ton="primaire">{ROLES[utilisateur?.role]}</Badge>
          </div>
        </Card>
        <Card titre="Coordonnées">
          <form onSubmit={soumettre} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Prénom" name="prenom" autoComplete="given-name" value={valeurs.prenom} onChange={changer} erreur={erreurs.prenom} requis />
              <Input label="Nom" name="nom" autoComplete="family-name" value={valeurs.nom} onChange={changer} erreur={erreurs.nom} requis />
            </div>
            <Input label="Adresse e-mail" value={utilisateur?.email ?? ''} disabled aide="L'e-mail sert d'identifiant et ne peut pas être modifié." />
            <Input label="Téléphone" name="telephone" type="tel" autoComplete="tel" value={valeurs.telephone} onChange={changer} erreur={erreurs.telephone} requis />
            {statut && <Alert ton={statut.ton}>{statut.texte}</Alert>}
            <div className="flex justify-end">
              <Button type="submit" chargement={envoi}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  )
}
