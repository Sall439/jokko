// Données factices initiales du mode mock. Les dates des rendez-vous sont
// calculées par rapport à « maintenant » pour que la démo reste pertinente.
import { addDays, addMinutes, combinerDateHeure, jourIso, startOfDay } from '../../utils/dates'

export const COMPTES_DEMO = [
  { role: 'patient', email: 'patient@jokko.sn', mot_de_passe: 'patient123' },
  { role: 'dentiste', email: 'dentiste@jokko.sn', mot_de_passe: 'dentiste123' },
  { role: 'admin', email: 'admin@jokko.sn', mot_de_passe: 'admin123' },
]

// Premier jour à partir de aujourd'hui + decalage dont le jour ISO est autorisé.
function jourDecale(maintenant, decalage, joursAutorises) {
  let jour = addDays(startOfDay(maintenant), decalage)
  while (!joursAutorises.includes(jourIso(jour))) {
    jour = addDays(jour, 1)
  }
  return jour
}

export function creerDonneesInitiales(maintenant = new Date()) {
  const utilisateurs = [
    { id: 1, prenom: 'Aminata', nom: 'Sarr', email: 'admin@jokko.sn', telephone: '77 100 00 01', role: 'admin', mot_de_passe: 'admin123' },
    { id: 2, prenom: 'Moussa', nom: 'Diop', email: 'dentiste@jokko.sn', telephone: '77 200 00 02', role: 'dentiste', mot_de_passe: 'dentiste123' },
    { id: 3, prenom: 'Awa', nom: 'Ndiaye', email: 'awa.ndiaye@jokko.sn', telephone: '77 200 00 03', role: 'dentiste', mot_de_passe: 'dentiste123' },
    { id: 4, prenom: 'Ibrahima', nom: 'Fall', email: 'ibrahima.fall@jokko.sn', telephone: '77 200 00 04', role: 'dentiste', mot_de_passe: 'dentiste123' },
    { id: 5, prenom: 'Fatou', nom: 'Diallo', email: 'patient@jokko.sn', telephone: '76 300 00 05', role: 'patient', mot_de_passe: 'patient123' },
    { id: 6, prenom: 'Cheikh', nom: 'Ba', email: 'cheikh.ba@exemple.sn', telephone: '76 300 00 06', role: 'patient', mot_de_passe: 'patient123' },
    { id: 7, prenom: 'Mariama', nom: 'Sow', email: 'mariama.sow@exemple.sn', telephone: '76 300 00 07', role: 'patient', mot_de_passe: 'patient123' },
  ]

  const praticiens = [
    { id: 1, utilisateur_id: 2, specialite: 'Dentisterie générale' },
    { id: 2, utilisateur_id: 3, specialite: 'Orthodontie' },
    { id: 3, utilisateur_id: 4, specialite: 'Chirurgie dentaire' },
  ]

  const services = [
    { id: 1, nom: 'Consultation', duree_minutes: 30, description: 'Examen complet de la bouche et bilan de santé bucco-dentaire.' },
    { id: 2, nom: 'Détartrage', duree_minutes: 45, description: 'Élimination du tartre et polissage pour des gencives saines.' },
    { id: 3, nom: 'Soin de carie', duree_minutes: 60, description: 'Traitement de la carie et pose d’un plombage ou composite.' },
    { id: 4, nom: 'Extraction', duree_minutes: 60, description: 'Retrait d’une dent abîmée, sous anesthésie locale.' },
    { id: 5, nom: 'Blanchiment', duree_minutes: 90, description: 'Éclaircissement des dents en cabinet, en une séance.' },
  ]

  const disponibilites = [
    ...[1, 2, 3, 4, 5].flatMap((jour, i) => [
      { id: i * 2 + 1, praticien_id: 1, jour_semaine: jour, heure_debut: '09:00', heure_fin: '13:00' },
      { id: i * 2 + 2, praticien_id: 1, jour_semaine: jour, heure_debut: '15:00', heure_fin: '18:00' },
    ]),
    { id: 11, praticien_id: 2, jour_semaine: 1, heure_debut: '09:00', heure_fin: '13:00' },
    { id: 12, praticien_id: 2, jour_semaine: 3, heure_debut: '09:00', heure_fin: '13:00' },
    { id: 13, praticien_id: 2, jour_semaine: 5, heure_debut: '09:00', heure_fin: '13:00' },
    { id: 14, praticien_id: 2, jour_semaine: 6, heure_debut: '09:00', heure_fin: '12:00' },
    { id: 15, praticien_id: 3, jour_semaine: 2, heure_debut: '08:30', heure_fin: '12:30' },
    { id: 16, praticien_id: 3, jour_semaine: 2, heure_debut: '14:30', heure_fin: '17:30' },
    { id: 17, praticien_id: 3, jour_semaine: 4, heure_debut: '08:30', heure_fin: '12:30' },
    { id: 18, praticien_id: 3, jour_semaine: 4, heure_debut: '14:30', heure_fin: '17:30' },
  ]

  const joursPraticien = {
    1: [1, 2, 3, 4, 5],
    2: [1, 3, 5, 6],
    3: [2, 4],
  }
  const dureeService = Object.fromEntries(services.map((s) => [s.id, s.duree_minutes]))

  const creerRdv = (id, patient_id, praticien_id, service_id, debut, statut, motif = '') => ({
    id,
    patient_id,
    praticien_id,
    service_id,
    debut: debut.toISOString(),
    fin: addMinutes(debut, dureeService[service_id]).toISOString(),
    statut,
    motif,
    cree_le: addDays(maintenant, -20).toISOString(),
  })

  const aDate = (praticienId, decalage, heure) =>
    combinerDateHeure(jourDecale(maintenant, decalage, joursPraticien[praticienId]), heure)

  // Rendez-vous « dans quelques heures » : sert à démontrer la règle des 24 h.
  const bientot = new Date(maintenant)
  bientot.setMinutes(0, 0, 0)
  const dansQuelquesHeures = addMinutes(bientot, 5 * 60)

  const rendezVous = [
    creerRdv(1, 5, 1, 1, aDate(1, 2, '10:00'), 'confirme', 'Contrôle annuel'),
    creerRdv(2, 5, 2, 2, aDate(2, 5, '09:30'), 'en_attente', 'Gencives sensibles'),
    creerRdv(3, 5, 1, 3, aDate(1, -10, '11:00'), 'termine', 'Douleur molaire'),
    creerRdv(4, 5, 3, 1, dansQuelquesHeures, 'confirme', 'Suivi après extraction'),
    creerRdv(5, 6, 1, 1, aDate(1, 1, '15:00'), 'en_attente', 'Première visite'),
    creerRdv(6, 7, 1, 2, aDate(1, 2, '11:00'), 'confirme', ''),
    creerRdv(7, 6, 3, 4, aDate(3, 3, '09:00'), 'confirme', 'Dent de sagesse'),
    creerRdv(8, 7, 2, 1, aDate(2, -14, '10:00'), 'termine', 'Bilan orthodontique'),
    creerRdv(9, 6, 1, 3, aDate(1, 4, '16:00'), 'annule', ''),
    creerRdv(10, 7, 3, 5, aDate(3, 6, '14:30'), 'en_attente', 'Avant un mariage'),
    creerRdv(11, 6, 1, 1, aDate(1, 0, '17:00'), 'confirme', 'Contrôle'),
  ]

  return { utilisateurs, praticiens, services, disponibilites, rendezVous }
}
