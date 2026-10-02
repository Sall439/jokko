import type { Patient, PatientSummary } from '@/types/patient';

/**
 * DTO renvoyé par l'API pour un patient.
 *
 * Volontairement réduit à l'identité et au téléphone : le cahier des charges
 * interdit les dossiers médicaux détaillés sur mobile (A3), l'API n'a donc
 * rien de plus à exposer ici.
 */
export interface PatientDto {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

/** DTO d'un patient suivi, avec son historique agrégé côté serveur. */
export interface PatientSummaryDto extends PatientDto {
  visit_count: number;
  upcoming_count: number;
  /** `null` si le patient n'a jamais eu de consultation. */
  last_visit_at: string | null;
  /** `null` si le patient n'a plus de rendez-vous à venir. */
  next_visit_at: string | null;
}

export function mapPatientDto(dto: PatientDto): Patient {
  return {
    id: dto.id,
    firstName: dto.first_name,
    lastName: dto.last_name,
    phone: dto.phone,
  };
}

export function mapPatientSummaryDto(dto: PatientSummaryDto): PatientSummary {
  return {
    ...mapPatientDto(dto),
    visitCount: dto.visit_count,
    upcomingCount: dto.upcoming_count,
    lastVisitAt: dto.last_visit_at,
    nextVisitAt: dto.next_visit_at,
  };
}
