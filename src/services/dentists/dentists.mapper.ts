import type { Dentist } from '@/types/dentist';

/** DTO renvoyé par l'API pour un praticien. Séparé du modèle (A7). */
export interface DentistDto {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  rating: number;
}

/** Mappe le DTO d'un praticien vers le modèle du client. */
export function mapDentistDto(dto: DentistDto): Dentist {
  return {
    id: dto.id,
    firstName: dto.first_name,
    lastName: dto.last_name,
    specialty: dto.specialty,
    rating: dto.rating,
  };
}
