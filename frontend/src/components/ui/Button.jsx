import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { classesBouton } from './buttonStyles'

export const Button = forwardRef(function Button(
  { variante, taille, pleineLargeur, chargement = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      className={classesBouton({ variante, taille, pleineLargeur, className })}
      {...props}
    >
      {chargement && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
})

export function ButtonLink({ variante, taille, pleineLargeur, className, children, ...props }) {
  return (
    <Link className={classesBouton({ variante, taille, pleineLargeur, className })} {...props}>
      {children}
    </Link>
  )
}
