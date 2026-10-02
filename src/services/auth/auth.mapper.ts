import { DomainError } from '@/services/errors';
import type { AuthSession, User } from '@/types/auth';
import { isRole } from '@/types/auth';

/**
 * DTO renvoyé par l'API pour un utilisateur. Séparé du modèle (A7).
 *
 * `dentist_id` est ce qui rattache un compte praticien à sa fiche : sans ce
 * lien, l'espace dentiste ne saurait pas quel agenda afficher (A8.6). Il est
 * donc obligatoire pour un rôle `dentist` côté API, et simplement absent pour
 * un patient.
 */
export interface UserDto {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  dentist_id?: string | null;
}

/** Enveloppe de session renvoyée par `POST /auth/login` et `/auth/register`. */
export interface AuthSessionDto {
  user: UserDto;
  access_token: string;
}

export function mapUserDto(dto: UserDto): User {
  if (!isRole(dto.role)) {
    throw new DomainError('UNKNOWN', 'Le rôle de ce compte est inconnu.');
  }

  return {
    id: dto.id,
    firstName: dto.first_name,
    lastName: dto.last_name,
    email: dto.email,
    phone: dto.phone,
    role: dto.role,
    ...(dto.dentist_id ? { dentistId: dto.dentist_id } : {}),
  };
}

export function mapAuthSessionDto(dto: AuthSessionDto): AuthSession {
  return {
    user: mapUserDto(dto.user),
    accessToken: dto.access_token,
  };
}

/** Corps de connexion et d'inscription : l'API n'attend pas de camelCase. */
export interface CredentialsDto {
  email: string;
  password: string;
}

export interface RegisterDto extends CredentialsDto {
  first_name: string;
  last_name: string;
  phone: string;
}
