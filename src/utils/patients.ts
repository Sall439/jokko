import type { Patient, PatientSummary } from '@/types/patient';
import type { Appointment } from '@/types/appointment';
import { foldSearchText } from '@/utils/text';

/**
 * Annuaire des patients d'un praticien (espace dentiste).
 *
 * Tout est dérivé des rendez-vous réellement enregistrés : le patient listé est
 * celui que le praticien a dans son agenda. Aucune donnée médicale n'est
 * agrégée (A3).
 */

/**
 * Liste des patients du praticien, avec leur historique.
 *
 * Les patients sans rendez-vous sont exclus : ils ne sont pas « suivis ».
 * Trié par nom de famille puis prénom, comme un annuaire de cabinet : à
 * l'accueil on cherche « Diop ? », pas « Moussa ? ».
 */
export function buildPatientList(
  appointments: Appointment[],
  patients: Patient[],
  now: Date = new Date(),
): PatientSummary[] {
  const byPatient = new Map<string, Appointment[]>();

  for (const appointment of appointments) {
    const existing = byPatient.get(appointment.patientId);
    if (existing) existing.push(appointment);
    else byPatient.set(appointment.patientId, [appointment]);
  }

  const nowMs = now.getTime();

  return [...byPatient.entries()]
    .map(([patientId, list]) => summarize(patientId, list, patients, nowMs))
    .filter((summary) => summary.firstName !== '' || summary.lastName !== '')
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, 'fr') || a.firstName.localeCompare(b.firstName, 'fr'),
    );
}

/**
 * Historique d'un seul patient.
 *
 * Une visite est un rendez-vous **passé** qui n'a pas été annulé : une demande
 * refusée n'a jamais eu lieu. Un rendez-vous à venir compte s'il est en attente
 * ou confirmé.
 */
function summarize(
  patientId: string,
  appointments: Appointment[],
  patients: Patient[],
  nowMs: number,
): PatientSummary {
  const patient = patients.find((item) => item.id === patientId);

  const past = appointments.filter(
    (a) => new Date(a.startAt).getTime() <= nowMs && a.status !== 'annule',
  );
  const upcoming = appointments.filter(
    (a) =>
      new Date(a.startAt).getTime() > nowMs &&
      (a.status === 'en_attente' || a.status === 'confirme'),
  );

  return {
    id: patientId,
    firstName: patient?.firstName ?? '',
    lastName: patient?.lastName ?? '',
    phone: patient?.phone ?? '',
    visitCount: past.length,
    upcomingCount: upcoming.length,
    lastVisitAt: latest(past)?.toISOString() ?? null,
    nextVisitAt: earliest(upcoming)?.toISOString() ?? null,
  };
}

function latest(appointments: Appointment[]): Date | null {
  return appointments.reduce<Date | null>(
    (best, a) => (best === null || new Date(a.startAt) > best ? new Date(a.startAt) : best),
    null,
  );
}

function earliest(appointments: Appointment[]): Date | null {
  return appointments.reduce<Date | null>(
    (best, a) => (best === null || new Date(a.startAt) < best ? new Date(a.startAt) : best),
    null,
  );
}

/** Filtre de recherche par nom, prénom ou téléphone, sans tenir compte des accents. */
export function filterPatients(list: PatientSummary[], query: string): PatientSummary[] {
  const needle = foldSearchText(query);

  if (needle.trim() === '') return list;

  return list.filter((patient) =>
    foldSearchText(`${patient.firstName} ${patient.lastName} ${patient.phone}`).includes(needle),
  );
}
