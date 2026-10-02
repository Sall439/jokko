import type { Role } from '@/types/auth';

/**
 * Rôles mobiles (A2) : `patient` et `dentist` uniquement.
 * Un compte `admin` existe côté API mais n'a pas accès à l'application mobile ;
 * il est refusé à la connexion (voir `services/auth`). Il n'a donc aucun groupe
 * de routes ici — c'est volontaire, pas un oubli.
 */
export type MobileRole = Exclude<Role, 'admin'>;

/** Groupe de routes autorisé pour chaque rôle mobile. */
export const ROLE_GROUP: Record<MobileRole, string> = {
  patient: '(patient)',
  dentist: '(dentist)',
};

/** Page d'accueil de chaque rôle mobile après connexion. */
export const ROLE_HOME_ROUTE: Record<MobileRole, string> = {
  patient: '/(patient)/book',
  dentist: '/(dentist)/agenda',
};

export const ROLE_LABEL: Record<Role, string> = {
  patient: 'Espace Patient',
  dentist: 'Espace Praticien',
  admin: 'Administration',
};

/** Source unique de la redirection par rôle (A6.1). */
export function getHomeRouteForRole(role: MobileRole): string {
  return ROLE_HOME_ROUTE[role];
}

/** Message de refus affiché quand un compte non-mobile se connecte (A2). */
export const ADMIN_MOBILE_REFUSAL =
  "Ce compte n'a pas accès à l'application mobile. Veuillez utiliser la version web.";

/**
 * Garde de type : `Role` → `MobileRole`.
 * Utilisée par la garde de navigation, qui doit savoir qu'un compte `admin`
 * n'a aucun espace sur mobile.
 */
export function isMobileRole(role: Role): role is MobileRole {
  return role !== 'admin';
}
