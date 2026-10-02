import { canTransition, STATUS_TRANSITIONS } from '@/types/appointment';
import type { AppointmentStatus } from '@/types/appointment';
import { getHomeRouteForRole, isMobileRole, ROLE_GROUP } from '@/utils/roles';

/**
 * Règles A6.1 (redirection par rôle) et A8.5 (transitions de statut).
 */

describe('getHomeRouteForRole — source unique de redirection (A6.1)', () => {
  it('envoie le patient sur son onglet Réserver', () => {
    expect(getHomeRouteForRole('patient')).toBe('/(patient)/book');
  });

  it('envoie le dentiste sur son onglet Agenda', () => {
    expect(getHomeRouteForRole('dentist')).toBe('/(dentist)/agenda');
  });

  it('ne renvoie jamais vers un groupe administrateur', () => {
    const routes = [getHomeRouteForRole('patient'), getHomeRouteForRole('dentist')];
    expect(routes.some((route) => route.includes('admin'))).toBe(false);
  });
});

describe('ROLE_GROUP — cloisonnement des espaces (A6.2)', () => {
  it('associe chaque rôle à son groupe de routes', () => {
    expect(ROLE_GROUP.patient).toBe('(patient)');
    expect(ROLE_GROUP.dentist).toBe('(dentist)');
  });

  it('la page d’accueil de chaque rôle est bien dans son groupe', () => {
    for (const role of ['patient', 'dentist'] as const) {
      expect(getHomeRouteForRole(role).includes(ROLE_GROUP[role])).toBe(true);
    }
  });

  it('la page d’accueil d’un rôle n’est jamais dans le groupe de l’autre', () => {
    expect(getHomeRouteForRole('patient').includes(ROLE_GROUP.dentist)).toBe(false);
    expect(getHomeRouteForRole('dentist').includes(ROLE_GROUP.patient)).toBe(false);
  });
});

describe('isMobileRole — refus du rôle administrateur (A2)', () => {
  it('accepte patient et dentist', () => {
    expect(isMobileRole('patient')).toBe(true);
    expect(isMobileRole('dentist')).toBe(true);
  });

  it('refuse admin', () => {
    expect(isMobileRole('admin')).toBe(false);
  });
});

describe('canTransition — table des transitions (A8.5)', () => {
  it('en attente peut être confirmée ou annulée', () => {
    expect(canTransition('en_attente', 'confirme')).toBe(true);
    expect(canTransition('en_attente', 'annule')).toBe(true);
  });

  it('en attente ne peut pas être terminée directement', () => {
    expect(canTransition('en_attente', 'termine')).toBe(false);
  });

  it('confirmé peut être terminé ou annulé', () => {
    expect(canTransition('confirme', 'termine')).toBe(true);
    expect(canTransition('confirme', 'annule')).toBe(true);
  });

  it('confirmé ne peut pas revenir en attente', () => {
    expect(canTransition('confirme', 'en_attente')).toBe(false);
  });

  it('terminé est final', () => {
    expect(STATUS_TRANSITIONS.termine).toEqual([]);
    for (const to of ['en_attente', 'confirme', 'annule', 'termine'] as AppointmentStatus[]) {
      expect(canTransition('termine', to)).toBe(false);
    }
  });

  it('annulé est final', () => {
    expect(STATUS_TRANSITIONS.annule).toEqual([]);
    for (const to of ['en_attente', 'confirme', 'annule', 'termine'] as AppointmentStatus[]) {
      expect(canTransition('annule', to)).toBe(false);
    }
  });

  it('aucun statut ne se transitions vers lui-même', () => {
    for (const status of ['en_attente', 'confirme', 'annule', 'termine'] as AppointmentStatus[]) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});
