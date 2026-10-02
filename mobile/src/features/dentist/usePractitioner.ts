import { useCallback, useEffect, useState } from 'react';

import { dentistsService } from '@/services/dentists';
import { useAuth } from '@/features/auth/useAuth';
import { DomainError } from '@/services/errors';

/**
 * Fiche du praticien connecté.
 *
 * Le compte porte `dentistId` : c'est ce lien qui garantit que l'agenda, les
 * disponibilités et les patients affichés sont ceux du praticien connecté, et
 * jamais ceux d'un collègue (A8.6).
 *
 * Sans lien, on ne « devine » pas le praticien à partir d'un nom — deux
 * praticiens peuvent porter le même prénom. La fiche est donc résolue auprès du
 * service `dentists` : un `dentistId` obsolète produit une erreur explicite,
 * plutôt qu'un agenda vide que l'on croirait honnêtement vide.
 *
 * Le nom affiché dans le bandeau vient de la session, pas d'ici : la fiche sert
 * à valider le rattachement, pas à réécrire l'identité.
 */

interface State {
  /** Fiche chargée, `null` tant que la résolution n'a pas abouti. */
  loaded: boolean;
  error: string | null;
}

export function usePractitioner() {
  const { user } = useAuth();
  const dentistId = user?.dentistId ?? null;

  const [state, setState] = useState<State>({ loaded: false, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requestKey = `${dentistId ?? ''}|${reloadKey}`;

  useEffect(() => {
    if (!dentistId) return;

    let cancelled = false;

    (async () => {
      try {
        await dentistsService.getById(dentistId);
        if (cancelled) return;

        setState({ loaded: true, error: null });
        setLoadedKey(requestKey);
      } catch (error) {
        if (cancelled) return;

        setState({
          loaded: false,
          error:
            error instanceof DomainError ? error.message : 'Votre fiche praticien est introuvable.',
        });
        setLoadedKey(requestKey);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `requestKey` résume exactement le praticien et le compteur de rechargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const loading = dentistId === null || loadedKey !== requestKey;

  /** Le compte n'est rattaché à aucune fiche praticien. */
  const unlinked = dentistId === null && state.loaded === false && loading === false;

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { dentistId, loading, error: state.error, unlinked, reload };
}
