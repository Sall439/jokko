import { CalendarCheck, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { ButtonLink } from '../../components/ui/Button'
import { ErrorState, Skeleton } from '../../components/ui/Feedback'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useAuth } from '../../hooks/useAuth'
import { soinsService } from '../../services/soinsService'
import { praticiensService } from '../../services/praticiensService'
import { formatDuree, libelleJour } from '../../utils/dates'
import { cheminAccueil, initiales, nomPraticien } from '../../utils/roles'

const ETAPES = [
  { titre: 'Choisissez un soin', texte: 'Consultation, détartrage, soin de carie… chaque soin affiche sa durée.' },
  { titre: 'Sélectionnez un créneau', texte: 'Les horaires libres de votre dentiste s’affichent en temps réel.' },
  { titre: 'Recevez la confirmation', texte: 'Le cabinet valide votre demande. Vous pouvez annuler jusqu’à 24 h avant.' },
]

function Hero() {
  const { utilisateur } = useAuth()
  const cible = utilisateur && utilisateur.role !== 'patient' ? cheminAccueil(utilisateur.role) : '/patient/nouveau-rendez-vous'
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
      <div className="flex flex-col gap-6">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-dark">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Cabinet dentaire · Dakar Plateau
        </p>
        <h1 className="text-balance font-display text-4xl font-bold leading-tight text-texte md:text-5xl">
          Votre rendez-vous chez le dentiste, <span className="text-primary">sans attendre au téléphone.</span>
        </h1>
        <p className="text-pretty text-lg leading-relaxed text-texte-secondaire">
          Choisissez votre soin, votre praticien et l&apos;horaire qui vous arrange. Le cabinet confirme votre
          rendez-vous et vous gardez la main pour le modifier.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink to={cible} taille="lg">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            Prendre rendez-vous
          </ButtonLink>
          {!utilisateur && (
            <ButtonLink to="/connexion" variante="secondaire" taille="lg">
              J&apos;ai déjà un compte
            </ButtonLink>
          )}
        </div>
      </div>
      <div className="relative">
        <img
          src="/images/cabinet.png"
          alt="Salle de soins lumineuse du cabinet JokkoDentiste"
          width={1200}
          height={900}
          className="aspect-[4/3] w-full rounded-carte object-cover shadow-carte"
        />
        <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-carte border border-texte/[0.06] bg-carte p-4 shadow-carte sm:left-auto sm:right-6 sm:w-72">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-succes/10 text-succes">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-texte">Détartrage confirmé</p>
            <p className="text-texte-secondaire">Mardi · 10:30 avec le Dr Diop</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Soins() {
  const { data: soins, loading, error, recharger } = useFetch(() => soinsService.lister())
  return (
    <section id="soins" aria-labelledby="titre-soins" className="bg-carte py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 id="titre-soins" className="font-display text-h2 text-texte">
            Nos soins
          </h2>
          <p className="leading-relaxed text-texte-secondaire">
            La durée indiquée correspond au temps réservé pour vous dans l&apos;agenda du praticien.
          </p>
        </div>
        {error && <ErrorState message={error} onReessayer={recharger} />}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-32" />
              </li>
            ))}
          {soins?.map((soin) => (
            <li key={soin.id} className="flex flex-col gap-2 rounded-carte border border-texte/[0.08] p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-h3 text-texte">{soin.nom}</h3>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {formatDuree(soin.duree_minutes)}
                </span>
              </div>
              <p className="text-pretty text-sm leading-relaxed text-texte-secondaire">{soin.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Equipe() {
  const { data: praticiens, loading } = useFetch(() => praticiensService.lister())
  return (
    <section id="equipe" aria-labelledby="titre-equipe" className="py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        <h2 id="titre-equipe" className="font-display text-h2 text-texte">
          L&apos;équipe
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading && <Skeleton className="h-24" />}
          {praticiens?.map((p) => (
            <li key={p.id} className="flex items-center gap-4 rounded-carte border border-texte/[0.06] bg-carte p-5 shadow-carte">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-carte"
                aria-hidden="true"
              >
                {initiales(p)}
              </span>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-display text-base font-semibold text-texte">{nomPraticien(p)}</h3>
                <p className="text-sm text-texte-secondaire">{p.specialite}</p>
                {p.jours_consultation?.length > 0 && (
                  <p className="text-xs text-texte-secondaire">
                    {p.jours_consultation.map((j) => libelleJour(j).slice(0, 3)).join(' · ')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function CommentCaMarche() {
  return (
    <section aria-labelledby="titre-etapes" className="bg-primary-dark py-16 text-carte">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        <h2 id="titre-etapes" className="font-display text-h2">
          Comment ça marche
        </h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {ETAPES.map((etape, i) => (
            <li key={etape.titre} className="flex gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-carte/30 font-display font-semibold"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-h3">{etape.titre}</h3>
                <p className="text-pretty text-sm leading-relaxed text-carte/80">{etape.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function InfosPratiques() {
  const infos = [
    { icone: MapPin, titre: 'Adresse', texte: '12 avenue Léopold Sédar Senghor, Dakar Plateau' },
    { icone: Clock, titre: 'Horaires', texte: 'Lundi – vendredi 8 h 30 – 18 h · Samedi 9 h – 12 h' },
    { icone: Phone, titre: 'Téléphone', texte: '+221 33 800 00 00' },
  ]
  return (
    <section id="infos" aria-labelledby="titre-infos" className="py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        <h2 id="titre-infos" className="font-display text-h2 text-texte">
          Infos pratiques
        </h2>
        <dl className="grid gap-4 md:grid-cols-3">
          {infos.map(({ icone: Icone, titre, texte }) => (
            <div key={titre} className="flex gap-3 rounded-carte bg-carte p-5 shadow-carte">
              <Icone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="font-semibold text-texte">{titre}</dt>
                <dd className="text-sm leading-relaxed text-texte-secondaire">{texte}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export function AccueilPage() {
  useDocumentTitle(null)
  return (
    <>
      <Hero />
      <Soins />
      <Equipe />
      <CommentCaMarche />
      <InfosPratiques />
    </>
  )
}
