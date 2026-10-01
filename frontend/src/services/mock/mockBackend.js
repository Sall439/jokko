// Backend factice en mémoire qui reproduit le contrat de l'API REST
// (cahier des charges, section 5), y compris les règles métier et les rôles.
// Les données sont conservées dans sessionStorage le temps de l'onglet.
import { addMinutes, heureVersMinutes, isSameDay, parseISODate, startOfDay } from '../../utils/dates'
import {
  estActif,
  estDansDisponibilites,
  genererCreneaux,
  peutAnnuler,
  peutModifier,
  seChevauchent,
} from '../../utils/rendezVous'
import { creerDonneesInitiales } from './mockData'

const CLE_STOCKAGE = 'jokkodentiste_mock_db'
const PREFIXE_TOKEN = 'mock-token-'

let db = chargerDb()

function chargerDb() {
  try {
    const brut = typeof window !== 'undefined' ? window.sessionStorage.getItem(CLE_STOCKAGE) : null
    if (brut) return JSON.parse(brut)
  } catch {
    // Données corrompues ou stockage indisponible : on repart des données initiales.
  }
  return creerDonneesInitiales()
}

function sauvegarder() {
  try {
    window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(db))
  } catch {
    // Stockage indisponible : les données restent en mémoire.
  }
}

export function reinitialiserMock(maintenant = new Date()) {
  db = creerDonneesInitiales(maintenant)
  try {
    window.sessionStorage.removeItem(CLE_STOCKAGE)
  } catch {
    // Rien à faire
  }
}

// ---------- Helpers de réponse ----------

class ErreurHttp extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const ok = (data, status = 200) => ({ status, data })
const erreur = (status, message) => {
  throw new ErreurHttp(status, message)
}

const prochainId = (liste) => liste.reduce((max, el) => Math.max(max, el.id), 0) + 1

function utilisateurPublic(u) {
  if (!u) return null
  const { mot_de_passe: _mdp, ...reste } = u
  const praticien = db.praticiens.find((p) => p.utilisateur_id === u.id)
  return praticien ? { ...reste, praticien_id: praticien.id } : reste
}

function praticienEnrichi(p) {
  const u = db.utilisateurs.find((x) => x.id === p.utilisateur_id)
  return {
    ...p,
    prenom: u?.prenom ?? '',
    nom: u?.nom ?? '',
    email: u?.email ?? '',
    telephone: u?.telephone ?? '',
    // Champ facultatif : jours ISO où le dentiste consulte (sert à griser le calendrier).
    jours_consultation: [...new Set(db.disponibilites.filter((d) => d.praticien_id === p.id).map((d) => d.jour_semaine))].sort(),
  }
}

function rdvEnrichi(r) {
  const patient = db.utilisateurs.find((u) => u.id === r.patient_id)
  const praticien = db.praticiens.find((p) => p.id === r.praticien_id)
  const service = db.services.find((s) => s.id === r.service_id)
  return {
    ...r,
    patient: patient
      ? { id: patient.id, prenom: patient.prenom, nom: patient.nom, email: patient.email, telephone: patient.telephone }
      : null,
    praticien: praticien ? praticienEnrichi(praticien) : null,
    service: service ? { ...service } : null,
  }
}

function exigerChamps(corps, champs) {
  const manquants = champs.filter((c) => corps[c] === undefined || corps[c] === null || String(corps[c]).trim() === '')
  if (manquants.length) erreur(422, `Champs obligatoires manquants : ${manquants.join(', ')}.`)
}

function trouver(liste, id, libelle) {
  const element = liste.find((x) => x.id === Number(id))
  if (!element) erreur(404, `${libelle} introuvable.`)
  return element
}

function praticienDe(utilisateur) {
  return db.praticiens.find((p) => p.utilisateur_id === utilisateur.id)
}

// ---------- Authentification et autorisation ----------

function utilisateurDepuisToken(authorization) {
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice(7)
  if (!token.startsWith(PREFIXE_TOKEN)) return null
  const id = Number(token.slice(PREFIXE_TOKEN.length))
  return db.utilisateurs.find((u) => u.id === id) ?? null
}

function exigerRole(utilisateur, roles) {
  if (!utilisateur) erreur(401, 'Session expirée. Veuillez vous reconnecter.')
  if (roles && !roles.includes(utilisateur.role)) erreur(403, 'Accès refusé pour votre rôle.')
}

// ---------- Validation d'un créneau de rendez-vous ----------

function validerCreneau({ praticien_id, service_id, debut, exclureId }) {
  const praticien = trouver(db.praticiens, praticien_id, 'Dentiste')
  const service = trouver(db.services, service_id, 'Service')
  const dateDebut = new Date(debut)
  if (Number.isNaN(dateDebut.getTime())) erreur(422, 'Date de rendez-vous invalide.')
  if (dateDebut <= new Date()) erreur(422, 'Impossible de réserver un créneau passé.')

  const dateFin = addMinutes(dateDebut, service.duree_minutes)
  const dispos = db.disponibilites.filter((d) => d.praticien_id === praticien.id)
  if (!estDansDisponibilites(dateDebut, dateFin, dispos)) {
    erreur(422, "Ce créneau est en dehors des horaires du dentiste.")
  }

  const conflit = db.rendezVous.some(
    (r) =>
      r.praticien_id === praticien.id &&
      r.id !== exclureId &&
      estActif(r) &&
      seChevauchent(r, { debut: dateDebut, fin: dateFin }),
  )
  if (conflit) erreur(409, "Ce créneau vient d'être réservé. Merci d'en choisir un autre.")

  return { praticien, service, debut: dateDebut.toISOString(), fin: dateFin.toISOString() }
}

// ---------- Routes ----------

const routes = [
  // Authentification
  {
    methode: 'POST',
    motif: '/auth/register',
    gerer: ({ corps }) => {
      exigerChamps(corps, ['prenom', 'nom', 'email', 'telephone', 'mot_de_passe'])
      const email = String(corps.email).trim().toLowerCase()
      if (db.utilisateurs.some((u) => u.email === email)) erreur(409, 'Un compte existe déjà avec cet e-mail.')
      if (String(corps.mot_de_passe).length < 8) erreur(422, 'Le mot de passe doit contenir au moins 8 caractères.')
      const utilisateur = {
        id: prochainId(db.utilisateurs),
        prenom: String(corps.prenom).trim(),
        nom: String(corps.nom).trim(),
        email,
        telephone: String(corps.telephone).trim(),
        role: 'patient',
        mot_de_passe: corps.mot_de_passe,
      }
      db.utilisateurs.push(utilisateur)
      return ok({ token: PREFIXE_TOKEN + utilisateur.id, utilisateur: utilisateurPublic(utilisateur) }, 201)
    },
  },
  {
    methode: 'POST',
    motif: '/auth/login',
    gerer: ({ corps }) => {
      const email = String(corps.email ?? '').trim().toLowerCase()
      const utilisateur = db.utilisateurs.find((u) => u.email === email)
      if (!utilisateur || utilisateur.mot_de_passe !== corps.mot_de_passe) {
        erreur(401, 'E-mail ou mot de passe incorrect.')
      }
      return ok({ token: PREFIXE_TOKEN + utilisateur.id, utilisateur: utilisateurPublic(utilisateur) })
    },
  },
  {
    methode: 'GET',
    motif: '/auth/me',
    gerer: ({ utilisateur }) => {
      exigerRole(utilisateur)
      return ok(utilisateurPublic(utilisateur))
    },
  },
  {
    methode: 'PUT',
    motif: '/auth/me',
    gerer: ({ utilisateur, corps }) => {
      exigerRole(utilisateur)
      exigerChamps(corps, ['prenom', 'nom', 'telephone'])
      utilisateur.prenom = String(corps.prenom).trim()
      utilisateur.nom = String(corps.nom).trim()
      utilisateur.telephone = String(corps.telephone).trim()
      return ok(utilisateurPublic(utilisateur))
    },
  },

  // Services dentaires
  { methode: 'GET', motif: '/services', gerer: () => ok(db.services) },
  {
    methode: 'POST',
    motif: '/services',
    gerer: ({ utilisateur, corps }) => {
      exigerRole(utilisateur, ['admin'])
      exigerChamps(corps, ['nom', 'duree_minutes'])
      const duree = Number(corps.duree_minutes)
      if (!Number.isInteger(duree) || duree < 15 || duree > 240) erreur(422, 'La durée doit être comprise entre 15 et 240 minutes.')
      const service = { id: prochainId(db.services), nom: String(corps.nom).trim(), duree_minutes: duree, description: corps.description ?? '' }
      db.services.push(service)
      return ok(service, 201)
    },
  },
  {
    methode: 'PUT',
    motif: '/services/:id',
    gerer: ({ utilisateur, params, corps }) => {
      exigerRole(utilisateur, ['admin'])
      const service = trouver(db.services, params.id, 'Service')
      exigerChamps(corps, ['nom', 'duree_minutes'])
      const duree = Number(corps.duree_minutes)
      if (!Number.isInteger(duree) || duree < 15 || duree > 240) erreur(422, 'La durée doit être comprise entre 15 et 240 minutes.')
      Object.assign(service, { nom: String(corps.nom).trim(), duree_minutes: duree, description: corps.description ?? '' })
      return ok(service)
    },
  },
  {
    methode: 'DELETE',
    motif: '/services/:id',
    gerer: ({ utilisateur, params }) => {
      exigerRole(utilisateur, ['admin'])
      const service = trouver(db.services, params.id, 'Service')
      const utilise = db.rendezVous.some((r) => r.service_id === service.id && estActif(r) && new Date(r.debut) > new Date())
      if (utilise) erreur(409, 'Ce service est lié à des rendez-vous à venir.')
      db.services = db.services.filter((s) => s.id !== service.id)
      return ok(null, 204)
    },
  },

  // Dentistes
  { methode: 'GET', motif: '/praticiens', gerer: () => ok(db.praticiens.map(praticienEnrichi)) },
  {
    methode: 'POST',
    motif: '/praticiens',
    gerer: ({ utilisateur, corps }) => {
      exigerRole(utilisateur, ['admin'])
      exigerChamps(corps, ['prenom', 'nom', 'email', 'telephone', 'specialite', 'mot_de_passe'])
      const email = String(corps.email).trim().toLowerCase()
      if (db.utilisateurs.some((u) => u.email === email)) erreur(409, 'Un compte existe déjà avec cet e-mail.')
      const compte = {
        id: prochainId(db.utilisateurs),
        prenom: String(corps.prenom).trim(),
        nom: String(corps.nom).trim(),
        email,
        telephone: String(corps.telephone).trim(),
        role: 'dentiste',
        mot_de_passe: corps.mot_de_passe,
      }
      db.utilisateurs.push(compte)
      const praticien = { id: prochainId(db.praticiens), utilisateur_id: compte.id, specialite: String(corps.specialite).trim() }
      db.praticiens.push(praticien)
      return ok(praticienEnrichi(praticien), 201)
    },
  },
  {
    methode: 'PUT',
    motif: '/praticiens/:id',
    gerer: ({ utilisateur, params, corps }) => {
      exigerRole(utilisateur, ['admin'])
      const praticien = trouver(db.praticiens, params.id, 'Dentiste')
      exigerChamps(corps, ['prenom', 'nom', 'telephone', 'specialite'])
      const compte = db.utilisateurs.find((u) => u.id === praticien.utilisateur_id)
      Object.assign(compte, { prenom: String(corps.prenom).trim(), nom: String(corps.nom).trim(), telephone: String(corps.telephone).trim() })
      praticien.specialite = String(corps.specialite).trim()
      return ok(praticienEnrichi(praticien))
    },
  },
  {
    methode: 'DELETE',
    motif: '/praticiens/:id',
    gerer: ({ utilisateur, params }) => {
      exigerRole(utilisateur, ['admin'])
      const praticien = trouver(db.praticiens, params.id, 'Dentiste')
      const aVenir = db.rendezVous.some((r) => r.praticien_id === praticien.id && estActif(r) && new Date(r.debut) > new Date())
      if (aVenir) erreur(409, 'Ce dentiste a encore des rendez-vous à venir.')
      db.praticiens = db.praticiens.filter((p) => p.id !== praticien.id)
      db.disponibilites = db.disponibilites.filter((d) => d.praticien_id !== praticien.id)
      const compte = db.utilisateurs.find((u) => u.id === praticien.utilisateur_id)
      if (compte) compte.role = 'patient'
      return ok(null, 204)
    },
  },
  {
    methode: 'GET',
    motif: '/praticiens/:id/creneaux',
    gerer: ({ params, query }) => {
      const praticien = trouver(db.praticiens, params.id, 'Dentiste')
      const service = trouver(db.services, query.service_id, 'Service')
      if (!query.date) erreur(422, 'Paramètre « date » manquant.')
      const exclure = Number(query.exclure_rdv) || null
      return ok(
        genererCreneaux({
          date: parseISODate(query.date),
          disponibilites: db.disponibilites.filter((d) => d.praticien_id === praticien.id),
          rendezVous: db.rendezVous.filter((r) => r.praticien_id === praticien.id && r.id !== exclure),
          dureeMinutes: service.duree_minutes,
        }),
      )
    },
  },

  // Disponibilités
  {
    methode: 'GET',
    motif: '/disponibilites',
    gerer: ({ utilisateur, query }) => {
      exigerRole(utilisateur, ['dentiste', 'admin'])
      const praticienId = utilisateur.role === 'dentiste' ? praticienDe(utilisateur)?.id : Number(query.praticien_id) || null
      const liste = praticienId ? db.disponibilites.filter((d) => d.praticien_id === praticienId) : db.disponibilites
      return ok(
        [...liste].sort((a, b) => a.jour_semaine - b.jour_semaine || heureVersMinutes(a.heure_debut) - heureVersMinutes(b.heure_debut)),
      )
    },
  },
  {
    methode: 'POST',
    motif: '/disponibilites',
    gerer: ({ utilisateur, corps }) => {
      exigerRole(utilisateur, ['dentiste', 'admin'])
      exigerChamps(corps, ['jour_semaine', 'heure_debut', 'heure_fin'])
      const praticienId = utilisateur.role === 'dentiste' ? praticienDe(utilisateur)?.id : Number(corps.praticien_id)
      trouver(db.praticiens, praticienId, 'Dentiste')
      const jour = Number(corps.jour_semaine)
      if (jour < 1 || jour > 7) erreur(422, 'Jour de la semaine invalide.')
      const debut = heureVersMinutes(corps.heure_debut)
      const fin = heureVersMinutes(corps.heure_fin)
      if (fin - debut < 30) erreur(422, "L'heure de fin doit suivre l'heure de début d'au moins 30 minutes.")
      const chevauche = db.disponibilites.some(
        (d) =>
          d.praticien_id === praticienId &&
          d.jour_semaine === jour &&
          debut < heureVersMinutes(d.heure_fin) &&
          heureVersMinutes(d.heure_debut) < fin,
      )
      if (chevauche) erreur(409, 'Cette plage chevauche une disponibilité existante.')
      const dispo = { id: prochainId(db.disponibilites), praticien_id: praticienId, jour_semaine: jour, heure_debut: corps.heure_debut, heure_fin: corps.heure_fin }
      db.disponibilites.push(dispo)
      return ok(dispo, 201)
    },
  },
  {
    methode: 'DELETE',
    motif: '/disponibilites/:id',
    gerer: ({ utilisateur, params }) => {
      exigerRole(utilisateur, ['dentiste', 'admin'])
      const dispo = trouver(db.disponibilites, params.id, 'Disponibilité')
      if (utilisateur.role === 'dentiste' && dispo.praticien_id !== praticienDe(utilisateur)?.id) erreur(403, 'Accès refusé.')
      db.disponibilites = db.disponibilites.filter((d) => d.id !== dispo.id)
      return ok(null, 204)
    },
  },

  // Rendez-vous
  {
    methode: 'GET',
    motif: '/rendez-vous',
    gerer: ({ utilisateur, query }) => {
      exigerRole(utilisateur)
      let liste = db.rendezVous
      if (utilisateur.role === 'patient') liste = liste.filter((r) => r.patient_id === utilisateur.id)
      if (utilisateur.role === 'dentiste') liste = liste.filter((r) => r.praticien_id === praticienDe(utilisateur)?.id)
      if (query.praticien_id) liste = liste.filter((r) => r.praticien_id === Number(query.praticien_id))
      if (query.statut) liste = liste.filter((r) => r.statut === query.statut)
      if (query.date) liste = liste.filter((r) => isSameDay(r.debut, parseISODate(query.date)))
      if (query.du) liste = liste.filter((r) => new Date(r.debut) >= startOfDay(parseISODate(query.du)))
      if (query.au) liste = liste.filter((r) => new Date(r.debut) < addMinutes(startOfDay(parseISODate(query.au)), 24 * 60))
      return ok([...liste].sort((a, b) => new Date(a.debut) - new Date(b.debut)).map(rdvEnrichi))
    },
  },
  {
    methode: 'GET',
    motif: '/rendez-vous/:id',
    gerer: ({ utilisateur, params }) => {
      exigerRole(utilisateur)
      const rdv = trouver(db.rendezVous, params.id, 'Rendez-vous')
      verifierAccesRdv(utilisateur, rdv)
      return ok(rdvEnrichi(rdv))
    },
  },
  {
    methode: 'POST',
    motif: '/rendez-vous',
    gerer: ({ utilisateur, corps }) => {
      exigerRole(utilisateur, ['patient', 'admin'])
      exigerChamps(corps, ['praticien_id', 'service_id', 'debut'])
      const patientId = utilisateur.role === 'admin' ? Number(corps.patient_id) : utilisateur.id
      if (!db.utilisateurs.some((u) => u.id === patientId)) erreur(422, 'Patient introuvable.')
      const creneau = validerCreneau(corps)
      const rdv = {
        id: prochainId(db.rendezVous),
        patient_id: patientId,
        praticien_id: creneau.praticien.id,
        service_id: creneau.service.id,
        debut: creneau.debut,
        fin: creneau.fin,
        statut: 'en_attente',
        motif: String(corps.motif ?? '').trim(),
        cree_le: new Date().toISOString(),
      }
      db.rendezVous.push(rdv)
      return ok(rdvEnrichi(rdv), 201)
    },
  },
  {
    methode: 'PATCH',
    motif: '/rendez-vous/:id',
    gerer: ({ utilisateur, params, corps }) => {
      exigerRole(utilisateur)
      const rdv = trouver(db.rendezVous, params.id, 'Rendez-vous')
      verifierAccesRdv(utilisateur, rdv)

      if (corps.statut) {
        changerStatut(utilisateur, rdv, corps.statut)
      } else {
        if (utilisateur.role === 'patient') {
          const regle = peutModifier(rdv)
          if (!regle.autorise) erreur(422, regle.raison)
        }
        const creneau = validerCreneau({
          praticien_id: corps.praticien_id ?? rdv.praticien_id,
          service_id: corps.service_id ?? rdv.service_id,
          debut: corps.debut ?? rdv.debut,
          exclureId: rdv.id,
        })
        Object.assign(rdv, {
          praticien_id: creneau.praticien.id,
          service_id: creneau.service.id,
          debut: creneau.debut,
          fin: creneau.fin,
          motif: corps.motif !== undefined ? String(corps.motif).trim() : rdv.motif,
          statut: 'en_attente',
        })
      }
      return ok(rdvEnrichi(rdv))
    },
  },

  // Utilisateurs
  {
    methode: 'GET',
    motif: '/utilisateurs',
    gerer: ({ utilisateur, query }) => {
      exigerRole(utilisateur, ['admin'])
      let liste = db.utilisateurs
      if (query.role) liste = liste.filter((u) => u.role === query.role)
      return ok(liste.map(utilisateurPublic))
    },
  },
  {
    methode: 'PATCH',
    motif: '/utilisateurs/:id',
    gerer: ({ utilisateur, params, corps }) => {
      exigerRole(utilisateur, ['admin'])
      const cible = trouver(db.utilisateurs, params.id, 'Utilisateur')
      if (cible.id === utilisateur.id) erreur(422, 'Vous ne pouvez pas modifier votre propre rôle.')
      if (!['patient', 'dentiste', 'admin'].includes(corps.role)) erreur(422, 'Rôle invalide.')
      if (cible.role === 'dentiste' && corps.role !== 'dentiste') {
        const praticien = praticienDe(cible)
        if (praticien && db.rendezVous.some((r) => r.praticien_id === praticien.id && estActif(r) && new Date(r.debut) > new Date())) {
          erreur(409, 'Ce dentiste a encore des rendez-vous à venir.')
        }
        db.praticiens = db.praticiens.filter((p) => p.utilisateur_id !== cible.id)
      }
      if (corps.role === 'dentiste' && !praticienDe(cible)) {
        db.praticiens.push({ id: prochainId(db.praticiens), utilisateur_id: cible.id, specialite: 'Dentisterie générale' })
      }
      cible.role = corps.role
      return ok(utilisateurPublic(cible))
    },
  },
  {
    methode: 'DELETE',
    motif: '/utilisateurs/:id',
    gerer: ({ utilisateur, params }) => {
      exigerRole(utilisateur, ['admin'])
      const cible = trouver(db.utilisateurs, params.id, 'Utilisateur')
      if (cible.id === utilisateur.id) erreur(422, 'Vous ne pouvez pas supprimer votre propre compte.')
      if (db.rendezVous.some((r) => r.patient_id === cible.id && estActif(r) && new Date(r.debut) > new Date())) {
        erreur(409, 'Cet utilisateur a des rendez-vous à venir.')
      }
      if (cible.role === 'dentiste') erreur(409, 'Retirez d’abord ce compte de la liste des dentistes.')
      db.utilisateurs = db.utilisateurs.filter((u) => u.id !== cible.id)
      return ok(null, 204)
    },
  },
]

function verifierAccesRdv(utilisateur, rdv) {
  if (utilisateur.role === 'patient' && rdv.patient_id !== utilisateur.id) erreur(403, 'Accès refusé.')
  if (utilisateur.role === 'dentiste' && rdv.praticien_id !== praticienDe(utilisateur)?.id) erreur(403, 'Accès refusé.')
}

const TRANSITIONS_PRATICIEN = {
  en_attente: ['confirme', 'annule'],
  confirme: ['termine', 'annule'],
}

function changerStatut(utilisateur, rdv, statut) {
  if (utilisateur.role === 'patient') {
    if (statut !== 'annule') erreur(403, 'Un patient peut uniquement annuler son rendez-vous.')
    const regle = peutAnnuler(rdv)
    if (!regle.autorise) erreur(422, regle.raison)
  } else if (!TRANSITIONS_PRATICIEN[rdv.statut]?.includes(statut)) {
    erreur(422, 'Changement de statut non autorisé.')
  }
  rdv.statut = statut
}

function correspondre(motif, chemin) {
  const partiesMotif = motif.split('/').filter(Boolean)
  const partiesChemin = chemin.split('/').filter(Boolean)
  if (partiesMotif.length !== partiesChemin.length) return null
  const params = {}
  for (let i = 0; i < partiesMotif.length; i += 1) {
    if (partiesMotif[i].startsWith(':')) params[partiesMotif[i].slice(1)] = decodeURIComponent(partiesChemin[i])
    else if (partiesMotif[i] !== partiesChemin[i]) return null
  }
  return params
}

export function traiterRequeteMock({ methode, chemin, query = {}, corps = {}, authorization }) {
  const cheminPropre = chemin.replace(/\/+$/, '') || '/'
  for (const route of routes) {
    if (route.methode !== methode) continue
    const params = correspondre(route.motif, cheminPropre)
    if (!params) continue
    try {
      const utilisateur = utilisateurDepuisToken(authorization)
      const reponse = route.gerer({ params, query, corps, utilisateur })
      if (methode !== 'GET') sauvegarder()
      return reponse
    } catch (e) {
      if (e instanceof ErreurHttp) return { status: e.status, data: { message: e.message } }
      console.error('[mock] Erreur inattendue', e)
      return { status: 500, data: { message: 'Erreur interne du serveur factice.' } }
    }
  }
  return { status: 404, data: { message: `Route inconnue : ${methode} ${chemin}` } }
}
