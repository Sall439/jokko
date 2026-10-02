import { mockAuthService } from '@/services/auth/auth.service.mock';
import { AuthError } from '@/services/auth/auth.service';
import { setMockLatency } from '@/services/errors';
import { ADMIN_MOBILE_REFUSAL } from '@/utils/roles';

/**
 * Règles d'authentification vérifiées côté service (A2, A6).
 *
 * Le mock garde ses comptes en mémoire : les tests n'inscrivent que des comptes
 * à usage unique et ne testent donc pas l'accumulation.
 */

const PATIENT = { email: 'moussa.diop@jokkodent.sn', password: 'patient123' };
const DENTIST = { email: 'aminata.ndiaye@jokkodent.sn', password: 'dentist123' };
const ADMIN = { email: 'aissatou.ba@jokkodent.sn', password: 'admin123' };

beforeAll(() => setMockLatency(0));

describe('login — comptes de démonstration', () => {
  it('ouvre une session patient', async () => {
    const session = await mockAuthService.login(PATIENT);

    expect(session.user.role).toBe('patient');
    expect(session.user.email).toBe(PATIENT.email);
    expect(session.accessToken).toContain(session.user.id);
  });

  it('ouvre une session dentiste', async () => {
    const session = await mockAuthService.login(DENTIST);

    expect(session.user.role).toBe('dentist');
  });

  it('rattache le compte dentiste à sa fiche praticien (A8.6)', async () => {
    // Sans ce lien, l'espace dentiste ne saurait pas quel agenda afficher.
    const session = await mockAuthService.login(DENTIST);

    expect(session.user.dentistId).toBe('dentist-ndiaye');
  });

  it('ne rattache aucune fiche à un compte patient', async () => {
    const session = await mockAuthService.login(PATIENT);

    expect(session.user.dentistId).toBeUndefined();
  });

  it('accepte une adresse email avec des espaces et des majuscules', async () => {
    const session = await mockAuthService.login({
      email: '  MOUSSA.DIOP@Jokkodent.SN ',
      password: PATIENT.password,
    });

    expect(session.user.email).toBe(PATIENT.email);
  });

  it('ne renvoie jamais le mot de passe dans la session', async () => {
    const session = await mockAuthService.login(PATIENT);

    expect(JSON.stringify(session)).not.toContain(PATIENT.password);
  });
});

describe('login — refus du compte administrateur (A2)', () => {
  it('refuse un compte admin avec le message prévu', async () => {
    await expect(mockAuthService.login(ADMIN)).rejects.toBeInstanceOf(AuthError);
    await expect(mockAuthService.login(ADMIN)).rejects.toMatchObject({
      code: 'ROLE_NOT_ALLOWED',
      message: ADMIN_MOBILE_REFUSAL,
    });
  });

  it('renseigne la version web dans le message', () => {
    expect(ADMIN_MOBILE_REFUSAL).toContain('version web');
  });

  it('ne renvoie ni utilisateur ni jeton au compte admin', async () => {
    const refused = await mockAuthService.login(ADMIN).catch((error: AuthError) => error);

    expect(refused).toBeInstanceOf(AuthError);
    expect(refused).not.toHaveProperty('accessToken');
    expect(refused).not.toHaveProperty('user');
  });

  it('ne concerne que le rôle admin : les deux rôles mobiles passent', async () => {
    await expect(mockAuthService.login(PATIENT)).resolves.toHaveProperty('user.role', 'patient');
    await expect(mockAuthService.login(DENTIST)).resolves.toHaveProperty('user.role', 'dentist');
  });
});

describe('login — erreurs', () => {
  it('refuse un mot de passe incorrect', async () => {
    await expect(
      mockAuthService.login({ email: PATIENT.email, password: 'mauvais' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('refuse une adresse inconnue', async () => {
    await expect(
      mockAuthService.login({ email: 'inconnu@jokkodent.sn', password: 'patient123' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('utilise le même message pour un email inconnu et un mot de passe faux', async () => {
    const unknown = await mockAuthService
      .login({ email: 'inconnu@jokkodent.sn', password: 'x' })
      .catch((error: AuthError) => error.message);
    const wrongPassword = await mockAuthService
      .login({ email: PATIENT.email, password: 'x' })
      .catch((error: AuthError) => error.message);

    // Ne pas révéler quelle information est erronée.
    expect(unknown).toBe(wrongPassword);
  });
});

describe('register — création de patient (A2)', () => {
  /**
   * Le mock garde ses comptes en mémoire pour toute la durée du fichier : chaque
   * inscription doit donc viser une adresse différente, sinon les tests
   * s'influencent dans l'ordre d'exécution.
   */
  let counter = 0;
  const payload = () => ({
    firstName: 'Awa',
    lastName: 'Sow',
    email: `awa.sow.${(counter += 1)}@example.sn`,
    phone: '+221 77 111 22 33',
    password: 'motdepasse1',
  });

  it('crée un compte patient, sans possibilité de choisir un autre rôle', async () => {
    // `RegisterPayload` ne comporte aucun rôle : l'inscription publique ne peut
    // pas produire autre chose qu'un patient (A2).
    const session = await mockAuthService.register(payload());

    expect(session.user.role).toBe('patient');
  });

  it('normalise l’adresse email en minuscules', async () => {
    const session = await mockAuthService.register({
      ...payload(),
      email: '  mixed.Case.Address@Example.SN ',
    });

    expect(session.user.email).toBe('mixed.case.address@example.sn');
  });

  it('refuse une adresse déjà utilisée', async () => {
    const already = payload();

    await mockAuthService.register(already);
    await expect(mockAuthService.register({ ...already })).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    });
  });

  it('refuse une adresse déjà utilisée malgré sa casse et ses espaces', async () => {
    const already = payload();
    await mockAuthService.register(already);

    await expect(
      mockAuthService.register({ ...already, email: `  ${already.email.toUpperCase()}  ` }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('refuse de réutiliser l’adresse d’un compte de démonstration', async () => {
    await expect(
      mockAuthService.register({ ...payload(), email: PATIENT.email }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('conserve les espaces du prénom et du nom', async () => {
    const session = await mockAuthService.register({
      ...payload(),
      firstName: '  Awa  ',
      lastName: '  Sow  ',
    });

    expect(session.user.firstName).toBe('Awa');
    expect(session.user.lastName).toBe('Sow');
  });

  it('ne renvoie jamais le mot de passe dans la session créée', async () => {
    const session = await mockAuthService.register(payload());

    expect(JSON.stringify(session)).not.toContain('motdepasse1');
  });
});

describe('logout', () => {
  it('ne lève pas d’erreur', async () => {
    await expect(mockAuthService.logout()).resolves.toBeUndefined();
  });
});
