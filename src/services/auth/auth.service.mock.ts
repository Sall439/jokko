import type { AuthSession, LoginPayload, RegisterPayload, User } from '@/types/auth';
import { ADMIN_MOBILE_REFUSAL } from '@/utils/roles';
import { wait } from '@/services/errors';
import { AuthError, type IAuthService } from './auth.service';

type StoredUser = User & { password: string };

/** La déconnexion est plus rapide que l'authentification : rien à calculer. */
const LOGOUT_LATENCY_MS = 100;

/** Comptes de seed B0 / A6.7. Le compte admin sert à tester le refus d'accès mobile. */
const users: StoredUser[] = [
  {
    id: 'u-patient-1',
    firstName: 'Moussa',
    lastName: 'Diop',
    email: 'moussa.diop@jokkodent.sn',
    phone: '+221 77 452 89 10',
    role: 'patient',
    password: 'patient123',
  },
  {
    id: 'u-dentist-1',
    firstName: 'Aminata',
    lastName: 'Ndiaye',
    email: 'aminata.ndiaye@jokkodent.sn',
    phone: '+221 77 100 20 30',
    role: 'dentist',
    // Le compte praticien est rattaché à sa fiche : sans ce lien, l'espace
    // dentiste ne saurait pas whose agenda afficher.
    dentistId: 'dentist-ndiaye',
    password: 'dentist123',
  },
  {
    id: 'u-admin-1',
    firstName: 'Aïssatou',
    lastName: 'Ba',
    email: 'aissatou.ba@jokkodent.sn',
    phone: '+221 77 300 40 50',
    role: 'admin',
    password: 'admin123',
  },
];

/**
 * Comptes de démonstration affichés sur l'écran de connexion (A6.7).
 * Les deux premiers servent à tester la redirection par rôle, le troisième à
 * vérifier le refus d'accès mobile d'un compte `admin`.
 */
export const DEMO_ACCOUNTS = users.map(({ email, password, role, firstName, lastName }) => ({
  email,
  password,
  role,
  label: `${firstName} ${lastName}`,
}));

const toSession = ({ password: _password, ...user }: StoredUser): AuthSession => ({
  user,
  accessToken: `mock-token-${user.id}`,
});

export const mockAuthService: IAuthService = {
  async login({ email, password }: LoginPayload) {
    await wait();

    const normalized = email.trim().toLowerCase();
    const found = users.find((u) => u.email === normalized && u.password === password);
    if (!found) {
      throw new AuthError(
        'INVALID_CREDENTIALS',
        'Adresse email ou mot de passe incorrect. Réessayez.',
      );
    }

    // A2 : aucun espace admin sur mobile. La session n'est jamais créée.
    if (found.role === 'admin') throw new AuthError('ROLE_NOT_ALLOWED', ADMIN_MOBILE_REFUSAL);

    return toSession(found);
  },

  async register(payload: RegisterPayload) {
    await wait();

    const email = payload.email.trim().toLowerCase();
    if (users.some((u) => u.email === email)) {
      throw new AuthError('EMAIL_TAKEN', 'Un compte existe déjà avec cette adresse email.');
    }

    // Règle métier A2 : l'inscription publique crée uniquement un PATIENT.
    const created: StoredUser = {
      id: `u-patient-${users.length + 1}`,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email,
      phone: payload.phone.trim(),
      role: 'patient',
      password: payload.password,
    };
    users.push(created);

    return toSession(created);
  },

  async logout() {
    await wait(LOGOUT_LATENCY_MS);
  },
};
