import type { Service } from '@/types/service';

/** DTO renvoyé par l'API pour un soin. Séparé du modèle (A7). */
export interface ServiceDto {
  id: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  price_fcfa: number;
  popular: boolean;
}

/**
 * Mappe le DTO de l'API vers le modèle du client.
 *
 * La conversion snake_case → camelCase est ici pour que le reste de
 * l'application n'ait jamais à connaître le format de l'API.
 */
export function mapServiceDto(dto: ServiceDto): Service {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category as Service['category'],
    description: dto.description,
    durationMinutes: dto.duration_minutes,
    priceFcfa: dto.price_fcfa,
    popular: dto.popular,
  };
}
