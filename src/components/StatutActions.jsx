import { useState } from 'react'
import { CalendarX2, Check, CheckCheck } from 'lucide-react'
import { Button } from './ui/Button'
import { ConfirmModal } from './ui/Modal'
import { rendezVousService } from '../services/rendezVousService'
import { messageErreur } from '../utils/errors'

// Transitions autorisées pour le cabinet (dentiste ou administrateur).
const ACTIONS = {
  en_attente: [
    { statut: 'confirme', label: 'Confirmer', icone: Check, variante: 'primaire' },
    { statut: 'annule', label: 'Refuser', icone: CalendarX2, variante: 'dangerDiscret', confirmer: true },
  ],
  confirme: [
    { statut: 'termine', label: 'Marquer terminé', icone: CheckCheck, variante: 'secondaire' },
    { statut: 'annule', label: 'Annuler', icone: CalendarX2, variante: 'dangerDiscret', confirmer: true },
  ],
}

export function StatutActions({ rdv, onMisAJour, onErreur, taille = 'sm' }) {
  const [enCours, setEnCours] = useState(null)
  const [aConfirmer, setAConfirmer] = useState(null)
  const [erreurModal, setErreurModal] = useState(null)
  const actions = ACTIONS[rdv.statut] ?? []
  if (!actions.length) return null

  const appliquer = async (statut, depuisModal = false) => {
    setEnCours(statut)
    setErreurModal(null)
    try {
      const maj = await rendezVousService.changerStatut(rdv.id, statut)
      onMisAJour(maj)
      setAConfirmer(null)
    } catch (err) {
      const message = messageErreur(err, 'Le changement de statut a échoué.')
      if (depuisModal) setErreurModal(message)
      else onErreur?.(message)
    } finally {
      setEnCours(null)
    }
  }

  return (
    <>
      {actions.map(({ statut, label, icone: Icone, variante, confirmer }) => (
        <Button
          key={statut}
          variante={variante}
          taille={taille}
          chargement={enCours === statut && !confirmer}
          disabled={Boolean(enCours)}
          onClick={() => (confirmer ? setAConfirmer(statut) : appliquer(statut))}
        >
          <Icone className="h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
      ))}
      <ConfirmModal
        ouvert={Boolean(aConfirmer)}
        onFermer={() => {
          setAConfirmer(null)
          setErreurModal(null)
        }}
        onConfirmer={() => appliquer(aConfirmer, true)}
        titre={rdv.statut === 'en_attente' ? 'Refuser cette demande ?' : 'Annuler ce rendez-vous ?'}
        description="Le créneau sera libéré pour d'autres patients."
        libelleConfirmer={rdv.statut === 'en_attente' ? 'Refuser' : 'Annuler le rendez-vous'}
        danger
        chargement={Boolean(enCours)}
        erreur={erreurModal}
      />
    </>
  )
}
