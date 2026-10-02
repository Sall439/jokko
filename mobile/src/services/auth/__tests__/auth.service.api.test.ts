import { apiAuthService } from '@/services/auth/auth.service.api';
import { getAccessToken, __resetAccessToken, setAccessToken } from '@/services/http/token-store';
import { ADMIN_MOBILE_REFUSAL } from '@/utils/roles';

const BASE = 'https://api.jokkodent.test/api';

const fetchMock = jest.fn();

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

/** Session renvoyée par l'API, encore en snake_case. */
const PATIENT_SESSION = {
  user: {
    id: 'u-patient-9',
    first_name: 'Ndèye',
    last_name: 'Diouf',
    email: 'ndeye.diouf@jokkodent.sn',
    phone: '+221 78 604 22 37',
    role: 'patient',
  },
  access_token: 'jwt-patient-9',
};

function call(index = 0): [string, RequestInit & { headers: Record<string, string> }] {
  return fetchMock.mock.calls[index] as [string, RequestInit & { headers: Record<string, string> }];
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  __resetAccessToken();
});

describe("Connexion sur l'API", () => {
  it('envoie des identifiants normalisés et ouvre la session', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, PATIENT_SESSION));

    const session = await apiAuthService.login({
      email: '  Ndeye.Diouf@JokkoDent.SN ',
      password: 'patient123',
    });

    const [url, init] = call();
    expect(url).toBe(`${BASE}/auth/login`);
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'ndeye.diouf@jokkodent.sn',
      password: 'patient123',
    });

    expect(session.user).toMatchObject({ firstName: 'Ndèye', lastName: 'Diouf', role: 'patient' });
    expect(session.accessToken).toBe('jwt-patient-9');
    expect(getAccessToken()).toBe('jwt-patient-9');
  });

  it("rattache la fiche du praticien renvoyée par l'API (A8.6)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        user: { ...PATIENT_SESSION.user, role: 'dentist', dentist_id: 'dentist-ndiaye' },
        access_token: 'jwt-dentist-1',
      }),
    );

    const session = await apiAuthService.login({ email: 'a@b.sn', password: 'x' });

    expect(session.user.dentistId).toBe('dentist-ndiaye');
  });

  it("traduit un 403 de l'API en refus d'accès mobile (A2)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(403, { error: { code: 'ROLE_NOT_ALLOWED', message: 'Administrateur.' } }),
    );

    await expect(
      apiAuthService.login({ email: 'aissatou.ba@jokkodent.sn', password: 'admin123' }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED', message: ADMIN_MOBILE_REFUSAL });

    expect(getAccessToken()).toBeNull();
  });

  it("refuse aussi une session `admin` que l'API aurait acceptée (A2)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        user: { ...PATIENT_SESSION.user, role: 'admin' },
        access_token: 'jwt-admin',
      }),
    );

    await expect(
      apiAuthService.login({ email: 'aissatou.ba@jokkodent.sn', password: 'admin123' }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED', message: ADMIN_MOBILE_REFUSAL });

    expect(getAccessToken()).toBeNull();
  });

  it('traduit des identifiants invalides', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'Adresse email ou mot de passe incorrect.' },
      }),
    );

    await expect(
      apiAuthService.login({ email: 'moussa.diop@jokkodent.sn', password: 'mauvais' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('garde le message de transport : un cabinet injoignable doit être dit', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(
      apiAuthService.login({ email: 'moussa.diop@jokkodent.sn', password: 'patient123' }),
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: 'Impossible de joindre le cabinet. Vérifiez votre connexion internet.',
    });
  });
});

describe("Inscription sur l'API", () => {
  it('envoie un corps en snake_case, sans rôle (A2)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, PATIENT_SESSION));

    await apiAuthService.register({
      firstName: ' Ndèye ',
      lastName: 'Diouf',
      email: 'Ndeye.Diouf@jokkodent.sn',
      phone: ' +221 78 604 22 37 ',
      password: 'patient123',
    });

    const [url, init] = call();
    expect(url).toBe(`${BASE}/auth/register`);
    expect(JSON.parse(init.body as string)).toEqual({
      first_name: 'Ndèye',
      last_name: 'Diouf',
      email: 'ndeye.diouf@jokkodent.sn',
      phone: '+221 78 604 22 37',
      password: 'patient123',
    });
  });

  it('refuse une inscription qui ne créerait pas un patient', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, {
        user: { ...PATIENT_SESSION.user, role: 'dentist', dentist_id: 'dentist-ndiaye' },
        access_token: 'jwt-dentist',
      }),
    );

    await expect(
      apiAuthService.register({
        firstName: 'Aminata',
        lastName: 'Ndiaye',
        email: 'aminata.ndiaye@jokkodent.sn',
        phone: '+221 77 100 20 30',
        password: 'dentist123',
      }),
    ).rejects.toMatchObject({
      message: "L'inscription publique crée uniquement un compte patient.",
    });

    expect(getAccessToken()).toBeNull();
  });
});

describe("Déconnexion sur l'API", () => {
  it('appelle le serveur puis libère le jeton', async () => {
    setAccessToken('jwt-patient-9');
    fetchMock.mockResolvedValue(jsonResponse(204));

    await apiAuthService.logout();

    expect(call()[0]).toBe(`${BASE}/auth/logout`);
    expect(getAccessToken()).toBeNull();
  });

  it('libère le jeton même si le serveur ne répond pas', async () => {
    setAccessToken('jwt-patient-9');
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiAuthService.logout()).rejects.toMatchObject({ code: 'NETWORK' });
    expect(getAccessToken()).toBeNull();
  });
});
