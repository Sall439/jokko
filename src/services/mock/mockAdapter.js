// Adaptateur Axios qui redirige les requêtes vers le backend factice en mémoire.
import { AxiosError } from 'axios'
import { traiterRequeteMock } from './mockBackend'

const LATENCE_MS = import.meta.env.MODE === 'test' ? 0 : 300

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function lireEntete(headers, nom) {
  if (!headers) return undefined
  if (typeof headers.get === 'function') return headers.get(nom)
  return headers[nom] ?? headers[nom.toLowerCase()]
}

function lireCorps(data) {
  if (!data) return {}
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return {}
    }
  }
  return data
}

export async function mockAdapter(config) {
  await attendre(LATENCE_MS)

  const base = config.baseURL ?? ''
  const brute = config.url?.startsWith(base) ? config.url.slice(base.length) : config.url ?? ''
  const [chemin, chaineRequete] = brute.split('?')
  const query = { ...Object.fromEntries(new URLSearchParams(chaineRequete ?? '')), ...(config.params ?? {}) }

  const { status, data } = traiterRequeteMock({
    methode: (config.method ?? 'get').toUpperCase(),
    chemin: chemin.startsWith('/') ? chemin : `/${chemin}`,
    query,
    corps: lireCorps(config.data),
    authorization: lireEntete(config.headers, 'Authorization'),
  })

  const reponse = {
    data: data === undefined ? null : structuredClone(data),
    status,
    statusText: String(status),
    headers: { 'content-type': 'application/json' },
    config,
    request: {},
  }

  if (status >= 400) {
    throw new AxiosError(
      data?.message ?? `Erreur ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      {},
      reponse,
    )
  }
  return reponse
}
