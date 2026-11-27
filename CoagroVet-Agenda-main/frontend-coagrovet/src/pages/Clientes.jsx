import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, Phone, Search, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Button from '../components/Button.jsx'
import Expediente from '../components/clientes/Expediente.jsx'
import DeleteRecordDialog from '../components/clientes/DeleteRecordDialog.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { searchOwners } from '../lib/api.js'

export default function Clientes() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const [query, setQuery] = useState('')
  const [owners, setOwners] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [petId, setPetId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (petId) return
    let cancelled = false
    searchOwners(query)
      .then((data) => !cancelled && setOwners(data))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [query, petId, reload])

  if (petId) {
    return (
      <Expediente
        petId={petId}
        onBack={() => setPetId(null)}
        onDeleted={() => {
          setPetId(null)
          setNotice('El expediente fue eliminado.')
        }}
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Expedientes de mascotas, organizados por dueño."
      />

      <label className="relative mb-5 block">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por nombre del dueño, identidad, teléfono o mascota"
          className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm shadow-sm placeholder:text-muted focus:border-brand-orange focus:outline-none"
        />
      </label>

      {notice && <p className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</p>}
      {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}.</p>}

      {owners && owners.length === 0 && (
        <section className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
          <p className="font-bold text-navy-700">
            {query ? 'No encontramos resultados' : 'Aún no hay clientes registrados'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {query
              ? 'Revisa el nombre o el número de identidad e intenta de nuevo.'
              : 'El expediente se crea al agendar la primera cita de un cliente nuevo.'}
          </p>
          {!query && (
            <Link to="/agendar" className="mt-4 inline-block">
              <Button>Agendar cita</Button>
            </Link>
          )}
        </section>
      )}

      <div className="space-y-3">
        {owners?.map((o) => (
          <article key={o.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-bold text-navy-700">{o.name}</h2>
                <p className="text-sm text-muted">ID {o.dni}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex items-center gap-1.5 text-sm text-ink/80">
                  <Phone size={14} className="text-brand-orange" aria-hidden />
                  {o.phone}
                </p>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setNotice(null)
                      setToDelete({ type: 'owner', id: o.id, name: o.name })
                    }}
                  >
                    <Trash2 size={16} aria-hidden /> Eliminar cliente
                  </Button>
                )}
              </div>
            </div>

            <p className="mb-2 mt-4 text-xs text-muted">
              {o.pets.length} {o.pets.length === 1 ? 'mascota' : 'mascotas'}
            </p>
            <div className="flex flex-wrap gap-2">
              {o.pets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPetId(p.id)}
                  className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-100"
                >
                  <PawPrint size={15} className="text-brand-orange" aria-hidden />
                  {p.name}
                  <span className="font-normal text-muted">{p.species}</span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {toDelete && (
        <DeleteRecordDialog
          target={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={() => {
            setNotice(`Se eliminó a ${toDelete.name} y sus expedientes.`)
            setToDelete(null)
            setReload((n) => n + 1)
          }}
        />
      )}
    </>
  )
}