import apiClient from './apiClient'

export const praticiensService = {
  async lister() {
    const { data } = await apiClient.get('/praticiens')
    return data
  },
  async creer(praticien) {
    const { data } = await apiClient.post('/praticiens', praticien)
    return data
  },
  async modifier(id, praticien) {
    const { data } = await apiClient.put(`/praticiens/${id}`, praticien)
    return data
  },
  async supprimer(id) {
    await apiClient.delete(`/praticiens/${id}`)
  },
  async creneaux(id, { date, serviceId, exclureRdv }) {
    const { data } = await apiClient.get(`/praticiens/${id}/creneaux`, {
      params: { date, service_id: serviceId, ...(exclureRdv ? { exclure_rdv: exclureRdv } : {}) },
    })
    return data
  },
}
