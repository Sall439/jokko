import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'

const classesControle = (erreur) =>
  cn(
    'w-full rounded-bouton border bg-carte px-3 text-sm text-texte placeholder:text-texte-secondaire/70 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-fond disabled:text-texte-secondaire',
    erreur ? 'border-erreur' : 'border-texte/15',
  )

function Enveloppe({ id, label, erreur, aide, requis, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-texte">
          {label}
          {requis && (
            <span className="text-erreur" aria-hidden="true">
              {' *'}
            </span>
          )}
        </label>
      )}
      {children}
      {aide && !erreur && (
        <p id={`${id}-aide`} className="text-xs text-texte-secondaire">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={`${id}-erreur`} className="text-xs font-medium text-erreur">
          {erreur}
        </p>
      )}
    </div>
  )
}

function attributsAria(id, erreur, aide) {
  const decrit = erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined
  return { 'aria-invalid': erreur ? true : undefined, 'aria-describedby': decrit }
}

export const Input = forwardRef(function Input({ label, erreur, aide, requis, className, id, ...props }, ref) {
  const idAuto = useId()
  const idChamp = id ?? idAuto
  return (
    <Enveloppe id={idChamp} label={label} erreur={erreur} aide={aide} requis={requis} className={className}>
      <input
        ref={ref}
        id={idChamp}
        required={requis}
        className={cn(classesControle(erreur), 'h-11')}
        {...attributsAria(idChamp, erreur, aide)}
        {...props}
      />
    </Enveloppe>
  )
})

export const Select = forwardRef(function Select(
  { label, erreur, aide, requis, className, id, children, ...props },
  ref,
) {
  const idAuto = useId()
  const idChamp = id ?? idAuto
  return (
    <Enveloppe id={idChamp} label={label} erreur={erreur} aide={aide} requis={requis} className={className}>
      <select
        ref={ref}
        id={idChamp}
        required={requis}
        className={cn(classesControle(erreur), 'h-11 pr-8')}
        {...attributsAria(idChamp, erreur, aide)}
        {...props}
      >
        {children}
      </select>
    </Enveloppe>
  )
})

export const Textarea = forwardRef(function Textarea({ label, erreur, aide, requis, className, id, ...props }, ref) {
  const idAuto = useId()
  const idChamp = id ?? idAuto
  return (
    <Enveloppe id={idChamp} label={label} erreur={erreur} aide={aide} requis={requis} className={className}>
      <textarea
        ref={ref}
        id={idChamp}
        required={requis}
        rows={3}
        className={cn(classesControle(erreur), 'py-2.5 leading-relaxed')}
        {...attributsAria(idChamp, erreur, aide)}
        {...props}
      />
    </Enveloppe>
  )
})
