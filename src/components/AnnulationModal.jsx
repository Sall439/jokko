import { useState } from 'react'
import { ConfirmModal } from './ui/Modal'
import { rendezVousService } from '../services/rendezVousService'
import { formatDateHeure } from '../utils/dates'
import { messageErreur } from '../utils/errors'

// Confirmation d'annulation d'un rendez-vous. `rdv` null = fermée.
export function AnnulationModal({ rdv, onFermer, onAnnule }) {
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(null)

  const fermer = () => {
    setErreur(null)
    onFermer()
  }

  const confirmer = async () => {
    setChargement(true)
    setErreur(null)
    try {
      const misAJour = await rendezVousService.annuler(rdv.id)
      onAnnule(misAJour)
      onFermer()
    } catch (err) {
      setErreur(messageErreur(err, "L'annulation a échoué."))
    } finally {
      setChargement(false)
    }
  }

  return (
    <ConfirmModal
      ouvert={Boolean(rdv)}
      onFermer={fermer}
      onConfirmer={confirmer}
      titre="Annuler ce rendez-vous ?"
      description={rdv ? `${rdv.service?.nom ?? 'Rendez-vous'} · ${formatDateHeure(rdv.debut)}` : undefined}
      libelleConfirmer="Oui, annuler"
      libelleAnnuler="Garder le rendez-vous"
      danger
      chargement={chargement}
      erreur={erreur}
    />
  )
}
