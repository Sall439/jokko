/**
 * Patient du cabinet, vu par le praticien (B0).
 *
 * Volontairement minimal : identité et téléphone. Le cahier des charges
 * interdit les dossiers médicaux détaillés (A3) — l'application mobile ne
 * contient ni antécédents, ni ordonnances, ni imagerie.
 */

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  /** Format international, tel que saisi à l'accueil. */
  phone: string;
}

/** Patient suivi par un praticien, avec son historique de rendez-vous. */
export interface PatientSummary extends Patient {
  /** Nombre de consultations passées (terminées ou déjà passées). */
  visitCount: number;
  /** Nombre de rendez-vous à venir, non annulés. */
  upcomingCount: number;
  /** Dernière consultation passée, `null` si le patient n'est jamais venu. */
  lastVisitAt: string | null;
  /** Prochain rendez-vous à venir, `null` s'il n'en a plus. */
  nextVisitAt: string | null;
}

export function getPatientDisplayName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`;
}
