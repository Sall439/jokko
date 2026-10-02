import type { User } from '@/types/auth';

/** Initiales pour l'avatar du bandeau : ex. « Moussa Diop » → « MD ». */
export function getInitials(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

/**
 * Nom d'affichage. Le préfixe « Dr. » n'est appliqué qu'au dentiste,
 * conformément à l'usage du cabinet.
 */
export function getDisplayName(user: User): string {
  const full = `${user.firstName} ${user.lastName}`;
  return user.role === 'dentist' ? `Dr. ${full}` : full;
}
