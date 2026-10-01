import { useEffect } from 'react'

export function useDocumentTitle(titre) {
  useEffect(() => {
    document.title = titre ? `${titre} · JokkoDentiste` : 'JokkoDentiste · Prise de rendez-vous dentaire'
  }, [titre])
}
