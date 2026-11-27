import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import Button from '../Button.jsx'
import PasswordPrompt from '../PasswordPrompt.jsx'
import { deleteOwner, deletePet, getDeletionImpact } from '../../lib/api.js'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// target: { type: 'owner' | 'pet', id, name }
export default function DeleteRecordDialog({ target, onClose, onDeleted }) {
  const [impact, setImpact] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getDeletionImpact(target.type, target.id)
      .then((data) => !cancelled && setImpact(data))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [target.type, target.id])

  const blocked = error || (impact && impact.scheduled > 0)

  useEffect(() => {
    if (!blocked) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [blocked, onClose])

  // No se puede eliminar todavía
  if (blocked) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/60 p-4" onClick={onClose}>
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="blocked-title"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-orange-soft text-brand-orange-dark">
              <TriangleAlert size={22} aria-hidden />
            </span>
            <div>
              <h2 id="blocked-title" className="text-lg font-extrabold text-navy-700">
                No se puede eliminar todavía
              </h2>
              <p className="mt-1 text-sm text-muted">
                {error
                  ? `${error}.`
                  : `${target.name} tiene ${plural(impact.scheduled, 'cita agendada', 'citas agendadas')}. Cancélalas desde la Agenda y vuelve a intentarlo.`}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose} autoFocus>Entendido</Button>
            {!error && (
              <Link to="/agenda">
                <Button className="w-full">Ir a la agenda</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!impact) return null

  const isOwner = target.type === 'owner'
  const history = impact.appointments > 0
    ? ` El historial (${plural(impact.appointments, 'cita', 'citas')}) se conserva en los informes, sin datos personales.`
    : ''
  const message = isOwner
    ? `Se eliminará a ${target.name}, ${plural(impact.pets, 'mascota', 'mascotas')} y sus expedientes.${history} Esta acción no se puede deshacer.`
    : `Se eliminará el expediente de ${target.name}.${history} Esta acción no se puede deshacer.`

  return (
    <PasswordPrompt
      open
      danger
      title={isOwner ? '¿Eliminar este cliente?' : '¿Eliminar este expediente?'}
      message={message}
      confirmLabel={isOwner ? 'Eliminar cliente' : 'Eliminar expediente'}
      onSubmit={async (password) => {
        await (isOwner ? deleteOwner : deletePet)(target.id, password)
        onDeleted()
      }}
      onCancel={onClose}
    />
  )
}