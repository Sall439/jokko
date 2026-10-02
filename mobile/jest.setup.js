/** Les règles de codage détectent l'usage de `__DEV__`, fourni par Metro mais
 * absent d'un environnement Node pur. */
global.__DEV__ = true;

// L'API est configurée au chargement du module `services/http/config` : les
// variables sont posées ici, avant tout import de test, sinon le client se
// refuserait à partir en indiquant que l'URL manque.
process.env.EXPO_PUBLIC_API_URL = 'https://api.jokkodent.test/api';
process.env.EXPO_PUBLIC_USE_MOCKS = 'true';