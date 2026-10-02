import { useNetworkState } from 'expo-network';

/**
 * État de la connexion du téléphone (Phase 7).
 *
 * `useNetworkState` est l'API officielle d'`expo-network` : le module est
 * fourni avec Expo Go, il n'y a donc rien à compiler pour l'utiliser. Le
 * bandeau « hors ligne » s'appuie dessus — et uniquement dessus : le simple
 * fait qu'une requête ait échoué ne prouve pas que le téléphone est hors
 * ligne, et l'inverse est vrai aussi (le cabinet peut être arrêté).
 *
 * L'information est déduite, pas affirmée : tant que le module n'a pas répondu,
 * `isOffline` vaut `false`. Un bandeau affiché par erreur serait plus gênant
 * qu'un bandeau affiché une demi-seconde plus tard.
 */
export function useIsOffline(): boolean {
  const state = useNetworkState();

  if (state.isInternetReachable === false) return true;
  if (state.isConnected === false) return true;

  return false;
}
