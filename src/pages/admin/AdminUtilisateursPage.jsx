import { useState } from 'react'
import { Search, Trash2, Users } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Alert'
import { ConfirmModal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { utilisateursService } from '../../services/utilisateursService'
import { messageErreur } from '../../utils/errors'
import { ROLES, nomComplet } from '../../utils/roles'

export function AdminUtilisateursPage() {
  useDocumentTitle('Utilisateurs')
  const { utilisateur: moi } = useAuth()
  const [role, setRole] = useState('')
  const [recherche, setRecherche] = useState('')
  const { data, loading, error, recharger, setData } = useFetch(
    () => utilisateursService.lister(role ? { role } : {}),
    [role],
  )
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)
  const [erreurSuppr, setErreurSuppr] = useState(null)

  const terme = recherche.trim().toLowerCase()
  const liste = (data ?? []).filter(
    (u) => !terme || nomComplet(u).toLowerCase().includes(terme) || u.email.toLowerCase().includes(terme),
  )

  const changerRole = async (u, nouveau) => {
    setEnCours(u.id)
    setErreur(null)
    try {
      const maj = await utilisateursService.changerRole(u.id, nouveau)
      setData((l) => l.map((x) => (x.id === u.id ? { ...x, ...maj } : x)))
    } catch (err) {
      setErreur(messageErreur(err, 'Changement de rôle impossible.'))
    } finally {
      setEnCours(null)
    }
  }

  const supprimer = async () => {
    setEnCours(aSupprimer.id)
    setErreurSuppr(null)
    try {
      await utilisateursService.supprimer(aSupprimer.id)
      setData((l) => l.filter((x) => x.id !== aSupprimer.id))
      setASupprimer(null)
    } catch (err) {
      setErreurSuppr(messageErreur(err))
    } finally {
      setEnCours(null)
    }
  }

  return (
    <>
      <PageHeader titre="Utilisateurs" description="Comptes patients, dentistes et administrateurs." />

      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <div className="relative">
            <Input label="Rechercher" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom ou e-mail" />
            <Search className="pointer-events-none absolute bottom-3.5 right-3 h-4 w-4 text-texte-secondaire" aria-hidden="true" />
          </div>
          <Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(ROLES).map(([valeur, label]) => (
              <option key={valeur} value={valeur}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {erreur && (
        <Alert ton="erreur" onFermer={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}
      {error && <ErrorState message={error} onReessayer={recharger} />}

      <Card corpsClassName="p-0">
        {loading && !data ? (
          <Skeleton className="m-4 h-48" />
        ) : liste.length === 0 ? (
          <EmptyState icone={Users} titre="Aucun utilisateur trouvé" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Liste des utilisateurs</caption>
              <thead className="border-b border-texte/[0.08] text-xs uppercase tracking-wide text-texte-secondaire">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Nom</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Contact</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Rôle</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-texte/[0.06]">
                {liste.map((u) => {
                  const estMoi = u.id === moi?.id
                  return (
                    <tr key={u.id} className="hover:bg-fond">
                      <td className="px-4 py-3 font-medium text-texte">
                        {nomComplet(u)}
                        {estMoi && <span className="ml-2 text-xs font-normal text-texte-secondaire">(vous)</span>}
                      </td>
                      <td className="px-4 py-3 text-texte-secondaire">
                        <span className="block break-all">{u.email}</span>
                        <span className="block">{u.telephone}</span>
                      </td>
                      <td className="px-4 py-3">
                        <label className="sr-only" htmlFor={`role-${u.id}`}>{`Rôle de ${nomComplet(u)}`}</label>
                        <select
                          id={`role-${u.id}`}
                          value={u.role}
                          disabled={estMoi || enCours === u.id}
                          onChange={(e) => changerRole(u, e.target.value)}
                          className="h-9 rounded-bouton border border-texte/[0.15] bg-carte px-2 text-sm text-texte focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                        >
                          {Object.entries(ROLES).map(([valeur, label]) => (
                            <option key={valeur} value={valeur}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!estMoi && (
                          <Button variante="dangerDiscret" taille="icone" onClick={() => setASupprimer(u)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">{`Supprimer ${nomComplet(u)}`}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        ouvert={Boolean(aSupprimer)}
        onFermer={() => {
          setASupprimer(null)
          setErreurSuppr(null)
        }}
        onConfirmer={supprimer}
        titre={`Supprimer le compte de ${aSupprimer ? nomComplet(aSupprimer) : ''} ?`}
        description="Cette action est définitive."
        libelleConfirmer="Supprimer"
        danger
        chargement={Boolean(enCours)}
        erreur={erreurSuppr}
      />
    </>
  )
}
