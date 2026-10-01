import apiClient from './apiClient'

export const authService = {
  async inscrire(donnees) {
    const { data } = await apiClient.post('/auth/register', donnees)
    return data
  },
  async connecter(email, motDePasse) {
    const { data } = await apiClient.post('/auth/login', { email, mot_de_passe: motDePasse })
    return data
  },
  async moi() {
    const { data } = await apiClient.get('/auth/me')
    return data
  },
  async modifierProfil(donnees) {
    const { data } = await apiClient.put('/auth/me', donnees)
    return data
  },
}
