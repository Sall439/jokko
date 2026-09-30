// Règles métier des rendez-vous, partagées par l'interface et le backend factice.
import { addMinutes, combinerDateHeure, heureVersMinutes, jourIso } from './dates'

export const STATUTS = {
  en_attente: { label: 'En attente', ton: 'attention' },
  confirme: { label: 'Confirmé', ton: 'succes' },
  annule: { label: 'Annulé', ton: 'erreur' },
  termine: { label: 'Terminé', ton: 'neutre' },
}

export const LISTE_STATUTS = Object.entries(STATUTS).map(([valeur, { label }]) => ({ valeur, label }))

export const DELAI_ANNULATION_HEURES = 24
export const PAS_CRENEAU_MINUTES = 30

const MS_PAR_HEURE = 3_600_000

export function estActif(rdv) {
  return rdv.statut === 'en_attente' || rdv.statut === 'confirme'
}

export function heuresAvant(rdv, maintenant = new Date()) {
  return (new Date(rdv.debut).getTime() - maintenant.getTime()) / MS_PAR_HEURE
}

// Un patient peut annuler (ou modifier) jusqu'à 24 h avant le rendez-vous.
export function peutAnnuler(rdv, maintenant = new Date()) {
  if (!estActif(rdv)) {
    return { autorise: false, raison: `Ce rendez-vous est ${STATUTS[rdv.statut]?.label.toLowerCase()}.` }
  }
  if (heuresAvant(rdv, maintenant) < DELAI_ANNULATION_HEURES) {
    return {
      autorise: false,
      raison: `Annulation impossible à moins de ${DELAI_ANNULATION_HEURES} h du rendez-vous. Merci d'appeler le cabinet.`,
    }
  }
  return { autorise: true, raison: null }
}

export function peutModifier(rdv, maintenant = new Date()) {
  const resultat = peutAnnuler(rdv, maintenant)
  if (!resultat.autorise && estActif(rdv)) {
    return {
      autorise: false,
      raison: `Modification impossible à moins de ${DELAI_ANNULATION_HEURES} h du rendez-vous. Merci d'appeler le cabinet.`,
    }
  }
  return resultat
}

export function seChevauchent(a, b) {
  return new Date(a.debut) < new Date(b.fin) && new Date(b.debut) < new Date(a.fin)
}

export function estDansDisponibilites(debut, fin, disponibilites) {
  const dateDebut = new Date(debut)
  const dateFin = new Date(fin)
  const jour = jourIso(dateDebut)
  return disponibilites.some((dispo) => {
    if (Number(dispo.jour_semaine) !== jour) return false
    const ouverture = combinerDateHeure(dateDebut, dispo.heure_debut)
    const fermeture = combinerDateHeure(dateDebut, dispo.heure_fin)
    return dateDebut >= ouverture && dateFin <= fermeture
  })
}

// Génère les créneaux d'une journée à partir des disponibilités hebdomadaires,
// en marquant comme indisponibles ceux qui sont passés ou déjà réservés.
export function genererCreneaux({
  date,
  disponibilites,
  rendezVous = [],
  dureeMinutes,
  pas = PAS_CRENEAU_MINUTES,
  maintenant = new Date(),
}) {
  const jour = jourIso(date)
  const reserves = rendezVous.filter(estActif)
  const creneaux = []

  disponibilites
    .filter((dispo) => Number(dispo.jour_semaine) === jour)
    .forEach((dispo) => {
      const fin = heureVersMinutes(dispo.heure_fin)
      for (let minute = heureVersMinutes(dispo.heure_debut); minute + dureeMinutes <= fin; minute += pas) {
        const debut = addMinutes(combinerDateHeure(date, '00:00'), minute)
        const creneau = { debut: debut.toISOString(), fin: addMinutes(debut, dureeMinutes).toISOString() }
        const passe = debut <= maintenant
        const reserve = reserves.some((rdv) => seChevauchent(creneau, rdv))
        creneaux.push({
          ...creneau,
          disponible: !passe && !reserve,
          raison: passe ? 'passe' : reserve ? 'reserve' : null,
        })
      }
    })

  return creneaux.sort((a, b) => new Date(a.debut) - new Date(b.debut))
}
