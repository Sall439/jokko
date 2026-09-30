import { useCallback, useEffect, useRef, useState } from 'react'
import { messageErreur } from '../utils/errors'

// Charge des données via une fonction asynchrone et expose
// { data, loading, error, recharger, setData }. Les données précédentes
// sont conservées pendant un rechargement pour éviter les clignotements.
export function useFetch(chargeur, dependances = [], { actif = true } = {}) {
  const [etat, setEtat] = useState({ data: null, loading: actif, error: null })
  const [version, setVersion] = useState(0)
  const chargeurRef = useRef(chargeur)
  chargeurRef.current = chargeur

  useEffect(() => {
    if (!actif) {
      setEtat({ data: null, loading: false, error: null })
      return undefined
    }
    let annule = false
    setEtat((precedent) => ({ ...precedent, loading: true, error: null }))
    chargeurRef
      .current()
      .then((data) => {
        if (!annule) setEtat({ data, loading: false, error: null })
      })
      .catch((erreur) => {
        if (!annule) setEtat({ data: null, loading: false, error: messageErreur(erreur) })
      })
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependances, version, actif])

  const recharger = useCallback(() => setVersion((v) => v + 1), [])
  const setData = useCallback((maj) => {
    setEtat((precedent) => ({
      ...precedent,
      data: typeof maj === 'function' ? maj(precedent.data) : maj,
    }))
  }, [])

  return { ...etat, recharger, setData }
}
