// Client HTTP unique de l'application.
// En mode mock (VITE_USE_MOCK=true), les requêtes sont interceptées par un
// adaptateur Axios qui simule l'API : les services restent identiques.
import axios from 'axios'
import { API_URL, USE_MOCK } from './config'
import { tokenStorage } from './tokenStorage'
import { mockAdapter } from './mock/mockAdapter'

export const EVENEMENT_SESSION_EXPIREE = 'jokkodentiste:session-expiree'

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

if (USE_MOCK) {
  apiClient.defaults.adapter = mockAdapter
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.lire()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (reponse) => reponse,
  (erreur) => {
    const url = erreur.config?.url ?? ''
    if (erreur.response?.status === 401 && !url.includes('/auth/login')) {
      tokenStorage.effacer()
      window.dispatchEvent(new Event(EVENEMENT_SESSION_EXPIREE))
    }
    return Promise.reject(erreur)
  },
)

export default apiClient
