// Fonctions utilitaires de manipulation et de formatage des dates (fr-FR).
// Les jours de la semaine suivent la norme ISO : 1 = lundi … 7 = dimanche.

const LOCALE = 'fr-FR'

export const JOURS_SEMAINE = [
  { valeur: 1, label: 'Lundi' },
  { valeur: 2, label: 'Mardi' },
  { valeur: 3, label: 'Mercredi' },
  { valeur: 4, label: 'Jeudi' },
  { valeur: 5, label: 'Vendredi' },
  { valeur: 6, label: 'Samedi' },
  { valeur: 7, label: 'Dimanche' },
]

export function libelleJour(jourIsoValeur) {
  return JOURS_SEMAINE.find((j) => j.valeur === Number(jourIsoValeur))?.label ?? ''
}

export function jourIso(date) {
  const jour = new Date(date).getDay()
  return jour === 0 ? 7 : jour
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, nombre) {
  const d = new Date(date)
  d.setDate(d.getDate() + nombre)
  return d
}

export function addMinutes(date, minutes) {
  return new Date(new Date(date).getTime() + minutes * 60_000)
}

export function startOfWeek(date) {
  const d = startOfDay(date)
  return addDays(d, 1 - jourIso(d))
}

export function isSameDay(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function isPastDay(date, maintenant = new Date()) {
  return startOfDay(date) < startOfDay(maintenant)
}

// Date locale au format YYYY-MM-DD (sans décalage UTC).
export function toISODate(date) {
  const d = new Date(date)
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mois}-${jour}`
}

export function parseISODate(valeur) {
  const [annee, mois, jour] = String(valeur).split('-').map(Number)
  return new Date(annee, mois - 1, jour)
}

export function heureVersMinutes(heure) {
  const [h, m] = String(heure).split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesVersHeure(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

export function combinerDateHeure(date, heure) {
  const d = startOfDay(date)
  return addMinutes(d, heureVersMinutes(heure))
}

export function capitaliser(texte) {
  return texte ? texte.charAt(0).toUpperCase() + texte.slice(1) : ''
}

export function formatDateLongue(date) {
  return capitaliser(
    new Date(date).toLocaleDateString(LOCALE, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  )
}

export function formatDateCourte(date) {
  return capitaliser(
    new Date(date).toLocaleDateString(LOCALE, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
  )
}

export function formatHeure(date) {
  return new Date(date).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

export function formatDateHeure(date) {
  return `${formatDateLongue(date)} à ${formatHeure(date)}`
}

export function formatMoisAnnee(date) {
  return capitaliser(new Date(date).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }))
}

export function formatDuree(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}
