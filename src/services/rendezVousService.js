import apiClient from './apiClient'

export const rendezVousService = {
  async lister(params = {}) {
    const { data } = await apiClient.get('/rendez-vous', { params })
    return data
  },
  async obtenir(id) {
    const { data } = await apiClient.get(`/rendez-vous/${id}`)
    return data
  },
  async creer(rendezVous) {
    const { data } = await apiClient.post('/rendez-vous', rendezVous)
    return data
  },
  async modifier(id, modifications) {
    const { data } = await apiClient.patch(`/rendez-vous/${id}`, modifications)
    return data
  },
  async changerStatut(id, statut) {
    const { data } = await apiClient.patch(`/rendez-vous/${id}`, { statut })
    return data
  },
  annuler(id) {
    return this.changerStatut(id, 'annule')
  },
}
