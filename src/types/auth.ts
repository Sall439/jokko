/**
 * Rôles renvoyés par l'API (A2).
 * `admin` existe mais n'a pas accès à l'application mobile : la connexion
 * est refusée, ce type sert à modéliser la réponse, pas une navigation.
 */
export type Role = 'patient' | 'dentist' | 'admin';

/**
 * Rôles possibles renvoyés par l'API, dans l'ordre d'affichage.
 * Utilisé par le mapper de connexion, qui valide le rôle reçu.
 */
export const ROLES: Role[] = ['patient', 'dentist', 'admin'];

/**
 * Le rôle reçu est-il connu ?
 *
 * Une session est lue à chaque démarrage : un rôle inconnu ne doit pas passer
 * en `Role` par un simple transtypage, la garde de navigation raisonne ensuite
 * sur cette valeur.
 */
export function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value);
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  /**
   * Fiche praticien rattachée au compte, pour les comptes `dentist`.
   *
   * Un compte praticien n'existe pas sans fiche : l'agenda, les disponibilités
   * et la liste des patients sont ceux de cette fiche, jamais d'un autre
   * (A8.6). Absent pour un patient.
   */
  dentistId?: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** L'inscription publique crée uniquement des patients (A2). */
export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}
