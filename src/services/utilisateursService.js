import apiClient from './apiClient'

export const utilisateursService = {
  async lister(params = {}) {
    const { data } = await apiClient.get('/utilisateurs', { params })
    return data
  },
  async changerRole(id, role) {
    const { data } = await apiClient.patch(`/utilisateurs/${id}`, { role })
    return data
  },
  async supprimer(id) {
    await apiClient.delete(`/utilisateurs/${id}`)
  },
}
