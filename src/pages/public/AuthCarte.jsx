// Cadre commun aux pages de connexion et d'inscription.
export function AuthCarte({ titre, description, children, pied }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 md:py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-balance font-display text-h1 text-texte">{titre}</h1>
        {description && <p className="text-pretty leading-relaxed text-texte-secondaire">{description}</p>}
      </div>
      <div className="flex flex-col gap-5 rounded-carte border border-texte/[0.06] bg-carte p-6 shadow-carte">{children}</div>
      {pied && <div className="text-center text-sm text-texte-secondaire">{pied}</div>}
    </div>
  )
}
