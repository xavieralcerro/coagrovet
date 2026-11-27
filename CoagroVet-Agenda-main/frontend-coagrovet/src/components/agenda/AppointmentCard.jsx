import { useState } from 'react'
import { Clock, Phone, Scissors } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import Button from '../Button.jsx'
import ConfirmDialog from '../ConfirmDialog.jsx'
import { formatDuration, formatShortDate, formatStamp, formatTime } from '../../lib/dates.js'

export default function AppointmentCard({ appointment: a, busy, onChangeStatus }) {
  const [confirming, setConfirming] = useState(false)
  const closed = a.status === 'completada' || a.status === 'cancelada'
  const created = a.history?.[0]
  const last = a.history?.length > 1 ? a.history[a.history.length - 1] : null

  function confirmCancel() {
    setConfirming(false)
    onChangeStatus(a.id, 'cancelada')
  }

  return (
    <>
      <article
        className={`flex gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5 ${
          closed ? 'opacity-70' : ''
        }`}
      >
        <div className="w-20 shrink-0 border-r border-black/10 pr-4 text-right">
          <p className="text-lg font-extrabold leading-tight text-navy-700">{formatTime(a.time)}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-xs text-muted">
            <Clock size={12} aria-hidden />
            {formatDuration(a.duration)}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-bold text-ink">
                {a.patient} <span className="font-medium text-muted">· {a.species}</span>
              </h3>
              <p className="text-sm text-muted">{a.client}</p>
            </div>
            <StatusBadge status={a.status} />
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/80">
            <li className="flex items-center gap-1.5">
              <Scissors size={14} className="text-brand-orange" aria-hidden />
              {a.service}
            </li>
            {a.phone && (
              <li className="flex items-center gap-1.5">
                <Phone size={14} className="text-brand-orange" aria-hidden />
                {a.phone}
              </li>
            )}
          </ul>

          {a.notes && <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-muted">{a.notes}</p>}

          <div className="mt-3 flex flex-col gap-1 border-t border-black/5 pt-3 text-xs text-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
            <p>
              Agendada por{' '}
              <strong className="text-navy-700">{created ? created.by.name : 'Sin registro'}</strong>
              {created && ` · ${formatStamp(created.at)}`}
            </p>
            {last && (
              <p>
                {last.action === 'completada' ? 'Completada' : 'Cancelada'} por{' '}
                <strong className="text-navy-700">{last.by.name}</strong> · {formatStamp(last.at)}
              </p>
            )}
          </div>

          {!closed && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => onChangeStatus(a.id, 'completada')}>
                Completar
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirming(true)}>
                Cancelar cita
              </Button>
            </div>
          )}
        </div>
      </article>

      <ConfirmDialog
        open={confirming}
        title="¿Cancelar esta cita?"
        message={`Vas a cancelar la cita de ${a.patient} (${a.client}) del ${formatShortDate(a.date)} a las ${formatTime(a.time)}. El horario quedará libre.`}
        confirmLabel="Sí, cancelar cita"
        cancelLabel="Volver"
        onConfirm={confirmCancel}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}