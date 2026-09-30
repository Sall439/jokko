// Services dentaires proposés par le cabinet (consultation, détartrage…).
import apiClient from './apiClient'

export const soinsService = {
  async lister() {
    const { data } = await apiClient.get('/services')
    return data
  },
  async creer(soin) {
    const { data } = await apiClient.post('/services', soin)
    return data
  },
  async modifier(id, soin) {
    const { data } = await apiClient.put(`/services/${id}`, soin)
    return data
  },
  async supprimer(id) {
    await apiClient.delete(`/services/${id}`)
  },
}
