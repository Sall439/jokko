import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts as usePoppinsFonts,
} from '@expo-google-fonts/poppins';

/**
 * Charge les polices de la charte (A4) et expose leur disponibilité.
 * `loaded` reste faux tant qu'une police manque, ou true si le chargement
 * échoue afin de ne pas bloquer l'application dans une boucle de chargement.
 */
export function useBrandFonts() {
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [poppinsLoaded, poppinsError] = usePoppinsFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const error = interError ?? poppinsError;

  return {
    loaded: (interLoaded && poppinsLoaded) || Boolean(error),
    error,
  };
}
