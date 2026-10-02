import { useCallback, useEffect, useState } from 'react';

import { catalogService } from '@/services/catalog';
import { dentistsService } from '@/services/dentists';
import type { Dentist } from '@/types/dentist';
import type { Service } from '@/types/service';

interface CatalogState {
  services: Service[];
  dentists: Dentist[];
  error: string | null;
}

const EMPTY: CatalogState = { services: [], dentists: [], error: null };

/**
 * Catalogue de soins et liste des praticiens (A5).
 *
 * Un seul chargement pour les deux listes : le parcours de réservation a besoin
 * des deux en même temps, et les charger séparément doublerait les états de
 * chargement sur l'écran « Soins ».
 *
 * Les listes ne sont pas filtrées ici : le filtrage est une décision d'écran.
 */
export function useCatalog() {
  const [state, setState] = useState<CatalogState>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [services, dentists] = await Promise.all([
          catalogService.list(),
          dentistsService.list(),
        ]);
        if (cancelled) return;

        setState({ services, dentists, error: null });
        setLoadedKey(reloadKey);
      } catch (error) {
        if (cancelled) return;

        setState({ ...EMPTY, error: error instanceof Error ? error.message : null });
        setLoadedKey(reloadKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // L'état de chargement découle de la clé chargée, jamais d'un `setState`
  // synchrone dans l'effet.
  const loading = loadedKey !== reloadKey;

  return { ...state, loading, error: state.error, reload };
}
