import apiClient from './apiClient'

export const disponibilitesService = {
  async lister(params = {}) {
    const { data } = await apiClient.get('/disponibilites', { params })
    return data
  },
  async creer(disponibilite) {
    const { data } = await apiClient.post('/disponibilites', disponibilite)
    return data
  },
  async supprimer(id) {
    await apiClient.delete(`/disponibilites/${id}`)
  },
}
