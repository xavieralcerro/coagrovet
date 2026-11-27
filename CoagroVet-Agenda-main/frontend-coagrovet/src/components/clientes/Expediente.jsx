import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Button from '../Button.jsx'
import StatusBadge from '../agenda/StatusBadge.jsx'
import DeleteRecordDialog from './DeleteRecordDialog.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getPetRecord } from '../../lib/api.js'
import { currentAgeMonths, formatAgeMonths, formatShortDate, formatTime } from '../../lib/dates.js'

function Item({ label, children }) {
  return (
    <div className="py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{children || '—'}</dd>
    </div>
  )
}

const Card = ({ title, children }) => (
  <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
    <h2 className="mb-2 font-extrabold text-navy-700">{title}</h2>
    {children}
  </section>
)

export default function Expediente({ petId, onBack, onDeleted }) {
  const { user } = useAuth()
  const [record, setRecord] = useState(null)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getPetRecord(petId).then(setRecord).catch((e) => setError(e.message))
  }, [petId])

  const backButton = (
    <Button variant="ghost" onClick={onBack} className="mb-5">
      <ArrowLeft size={16} aria-hidden /> Volver a clientes
    </Button>
  )

  if (error) {
    return (
      <>
        {backButton}
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}.</p>
      </>
    )
  }
  if (!record) return <div className="h-40 animate-pulse rounded-xl bg-white/70" />

  const { pet, owner, appointments, services } = record
  const done = appointments.filter((a) => a.status === 'completada').length

  return (
    <>
      {backButton}

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-navy-700 p-5 text-white sm:p-6">
        <div>
          <p className="text-xs text-white/60">Expediente de la mascota</p>
          <h1 className="text-2xl font-extrabold">{pet.name}</h1>
          <p className="text-sm text-white/80">
            {[pet.species, pet.breed].filter(Boolean).join(' · ')} · {done}{' '}
            {done === 1 ? 'visita completada' : 'visitas completadas'}
          </p>
        </div>
        {user.role === 'admin' && (
          <button
            onClick={() => setDeleting(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            <Trash2 size={16} aria-hidden /> Eliminar expediente
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Datos de la mascota">
          <dl className="grid grid-cols-2 gap-x-4">
            <Item label="Sexo">{pet.sex}</Item>
            <Item label="Edad actual">{formatAgeMonths(currentAgeMonths(pet))}</Item>
            <Item label="Comportamiento">{pet.temperament}</Item>
            <Item label="Vacunas al día">{pet.vaccinated ? 'Sí' : 'No indicado'}</Item>
            <div className="col-span-2">
              <Item label="Alergias, piel o salud">{pet.health}</Item>
            </div>
          </dl>
        </Card>

        <Card title="Datos del dueño">
          <dl className="grid grid-cols-2 gap-x-4">
            <div className="col-span-2"><Item label="Nombre">{owner?.name}</Item></div>
            <Item label="Identidad">{owner?.dni}</Item>
            <Item label="Teléfono">{owner?.phone}</Item>
            <Item label="Correo">{owner?.email}</Item>
            <Item label="Dirección">{owner?.address}</Item>
          </dl>
        </Card>
      </div>

      <div className="mt-5 space-y-5">
        <Card title="Servicios brindados">
          {services.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay servicios completados. Aparecerán al completar una cita.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {services.map((s) => (
                <li key={s.name} className="rounded-lg bg-surface px-3 py-2 text-sm">
                  <span className="font-semibold text-navy-700">{s.name}</span>{' '}
                  <span className="text-muted">× {s.count} · último {formatShortDate(s.last)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Historial de citas">
          <ul className="divide-y divide-black/5">
            {appointments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {formatShortDate(a.date)} · {formatTime(a.time)}
                  </p>
                  <p className="text-sm text-muted">{a.services.map((s) => s.name).join(', ')}</p>
                  {a.notes && <p className="mt-1 text-sm text-muted">Indicaciones: {a.notes}</p>}
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {deleting && (
        <DeleteRecordDialog
          target={{ type: 'pet', id: pet.id, name: pet.name }}
          onClose={() => setDeleting(false)}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}