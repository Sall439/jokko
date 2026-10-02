import { apiGet, apiPost, apiPut, pathId } from '@/services/http/client';
import { buildApiError, isApiError } from '@/services/http/errors';
import { __resetAccessToken, getAccessToken, setAccessToken } from '@/services/http/token-store';
import { ADMIN_MOBILE_REFUSAL } from '@/utils/roles';

const BASE = 'https://api.jokkodent.test/api';

const fetchMock = jest.fn();

/** Réponse HTTP minimale : le client ne lit que `ok`, `status` et `text()`. */
function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  __resetAccessToken();
});

describe('apiRequest — construction de la requête', () => {
  it("préfixe la racine de l'API et sérialise les paramètres", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await apiGet<unknown[]>('/services', { category: 'Prevention', page: 2, vide: undefined });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/services?category=Prevention&page=2`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('joint le jeton courant et sérialise le corps en JSON', async () => {
    setAccessToken('jwt-1');
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 'rdv-9' }));

    await apiPost('/appointments', { service_id: 'service-detartrage' });

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe(`${BASE}/appointments`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"service_id":"service-detartrage"}');
  });

  it("n'envoie aucun jeton sur la connexion", async () => {
    setAccessToken('jwt-ancien');
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'u-patient-1' }));

    await apiPost('/auth/login', { email: 'a@b.sn' }, { auth: false });

    const init = fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("accepte les verbes d'écriture et échappe les identifiants", async () => {
    fetchMock.mockResolvedValue(jsonResponse(204));

    await apiPut(`/dentists/${pathId('dentist ndiaye')}/availability`, { days: [] });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/dentists/dentist%20ndiaye/availability`);
    expect(init.method).toBe('PUT');
  });

  it('renvoie `undefined` sur une réponse sans corps', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204));

    await expect(apiPost('/auth/logout')).resolves.toBeUndefined();
  });
});

describe('apiRequest — traduction des échecs', () => {
  it("conserve le code métier renvoyé par l'API (A8)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: { code: 'SLOT_UNAVAILABLE', message: 'Créneau pris.' } }),
    );

    const error = await apiPost('/appointments').catch((thrown: unknown) => thrown);

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ code: 'SLOT_UNAVAILABLE', status: 409 });
    expect((error as Error).message).toBe('Créneau pris.');
  });

  it("retombe sur un code déduit du statut quand l'API n'envoie pas d'enveloppe", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, undefined));

    await expect(apiGet('/patients')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it("donne un message français même si l'API répond autre chose que du JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '<html>500</html>',
    });

    const error = await apiGet('/dentists').catch((thrown: unknown) => thrown);

    expect(error).toMatchObject({ code: 'UNKNOWN' });
    expect((error as Error).message).toBe('Une erreur est survenue. Réessayez dans un instant.');
  });

  it('transforme un échec réseau en erreur `NETWORK`', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiGet('/dentists')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it("abandonne une requête qui n'aboutit pas", async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );

    await expect(apiGet('/dentists', undefined, { timeoutMs: 5 })).rejects.toMatchObject({
      code: 'NETWORK',
      message: 'Le cabinet ne répond pas. Réessayez dans un instant.',
    });
  });
});

describe("Session invalidée par l'API", () => {
  it("vide le jeton et prévient l'abonné sur un 401", async () => {
    setAccessToken('jwt-expire');
    fetchMock.mockResolvedValue(jsonResponse(401, undefined));

    await expect(apiGet('/patients')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(getAccessToken()).toBeNull();
  });

  it('laisse le jeton intact sur un 401 de connexion', async () => {
    // Aucun jeton en cours : c'est un échec d'identification, pas une session
    // qui expire. Vider le jeton n'aurait rien à détruire.
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants faux.' } }),
    );

    await expect(apiPost('/auth/login', {}, { auth: false })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(getAccessToken()).toBeNull();
  });
});

describe('buildApiError — repli sur les statuts', () => {
  it('traduit un 404 sans code', () => {
    expect(buildApiError(404, {})).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('conserve un code métier connu sans le reformuler (A2, A7)', () => {
    const error = buildApiError(403, { error: { code: 'ROLE_NOT_ALLOWED' } });

    expect(error.code).toBe('ROLE_NOT_ALLOWED');
    expect(error.rawCode).toBe('ROLE_NOT_ALLOWED');
    expect(error.message).toBe(ADMIN_MOBILE_REFUSAL);
  });

  it('retombe sur le statut et retient le code inconnu pour le service', () => {
    const error = buildApiError(409, { error: { code: 'CODE_DU_FUTUR' } });

    expect(error.code).toBe('UNKNOWN');
    expect(error.rawCode).toBe('CODE_DU_FUTUR');
  });
});
