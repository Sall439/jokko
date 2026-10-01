import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'

const SELECTEUR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ ouvert, onFermer, titre, description, children, pied, taille = 'md' }) {
  const idTitre = useId()
  const idDescription = useId()
  const panneauRef = useRef(null)
  const onFermerRef = useRef(onFermer)
  onFermerRef.current = onFermer

  useEffect(() => {
    if (!ouvert) return undefined
    const elementPrecedent = document.activeElement
    const panneau = panneauRef.current
    const premier = panneau?.querySelector('[data-autofocus]') ?? panneau?.querySelector(SELECTEUR_FOCUSABLE)
    premier?.focus()

    const surTouche = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onFermerRef.current?.()
      }
      if (e.key === 'Tab' && panneau) {
        const elements = [...panneau.querySelectorAll(SELECTEUR_FOCUSABLE)]
        if (!elements.length) return
        const [debut, fin] = [elements[0], elements[elements.length - 1]]
        if (e.shiftKey && document.activeElement === debut) {
          e.preventDefault()
          fin.focus()
        } else if (!e.shiftKey && document.activeElement === fin) {
          e.preventDefault()
          debut.focus()
        }
      }
    }
    document.addEventListener('keydown', surTouche)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', surTouche)
      document.body.style.overflow = overflow
      elementPrecedent?.focus?.()
    }
  }, [ouvert])

  if (!ouvert) return null

  const largeur = taille === 'lg' ? 'max-w-2xl' : 'max-w-md'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-texte/40" aria-hidden="true" onClick={onFermer} />
      <div
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={description ? idDescription : undefined}
        className={`relative flex max-h-[92vh] w-full ${largeur} flex-col rounded-t-carte bg-carte shadow-xl sm:rounded-carte`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-texte/[0.06] px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 id={idTitre} className="font-display text-h3 text-texte">
              {titre}
            </h2>
            {description && (
              <p id={idDescription} className="text-sm leading-relaxed text-texte-secondaire">
                {description}
              </p>
            )}
          </div>
          <Button variante="discret" taille="icone" onClick={onFermer} className="-mr-2 -mt-1 shrink-0">
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Fermer</span>
          </Button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {pied && (
          <footer className="flex flex-col-reverse gap-2 border-t border-texte/[0.06] px-5 py-4 sm:flex-row sm:justify-end">
            {pied}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmModal({
  ouvert,
  onFermer,
  onConfirmer,
  titre,
  description,
  libelleConfirmer = 'Confirmer',
  libelleAnnuler = 'Retour',
  danger = false,
  chargement = false,
  erreur,
}) {
  return (
    <Modal
      ouvert={ouvert}
      onFermer={chargement ? () => {} : onFermer}
      titre={titre}
      description={description}
      pied={
        <>
          <Button variante="secondaire" onClick={onFermer} disabled={chargement} data-autofocus>
            {libelleAnnuler}
          </Button>
          <Button variante={danger ? 'danger' : 'primaire'} onClick={onConfirmer} chargement={chargement}>
            {libelleConfirmer}
          </Button>
        </>
      }
    >
      {erreur ? (
        <p role="alert" className="text-sm font-medium text-erreur">
          {erreur}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-texte-secondaire">Cette action sera enregistrée immédiatement.</p>
      )}
    </Modal>
  )
}
