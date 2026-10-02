import type { MobileRole } from '@/utils/roles';
import type { FeatherIconName } from '@/types/ui';

/** `name` = nom du fichier dans le dossier de la route (ex. book.tsx). */
export type RoleTab = { name: string; title: string; icon: FeatherIconName };

/** Onglets de l'espace patient (4 onglets, A5). */
export const PATIENT_TABS: RoleTab[] = [
  { name: 'book', title: 'Réserver', icon: 'plus' },
  { name: 'appointments', title: 'Mes RDV', icon: 'calendar' },
  { name: 'services', title: 'Soins', icon: 'activity' },
  { name: 'account', title: 'Mon compte', icon: 'user' },
];

/** Onglets de l'espace dentiste (4 onglets, A5). */
export const DENTIST_TABS: RoleTab[] = [
  { name: 'agenda', title: 'Agenda', icon: 'calendar' },
  { name: 'pending', title: 'En attente', icon: 'bell' },
  { name: 'availability', title: 'Disponibilités', icon: 'sliders' },
  { name: 'patients', title: 'Patients', icon: 'users' },
];

/** Onglets par rôle mobile. Aucun onglet admin sur mobile (A2). */
export const ROLE_TABS: Record<MobileRole, RoleTab[]> = {
  patient: PATIENT_TABS,
  dentist: DENTIST_TABS,
};
