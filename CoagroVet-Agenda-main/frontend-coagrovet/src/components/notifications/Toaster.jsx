import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useNotifications } from '../../context/NotificationsContext.jsx'
import { describeEvent } from '../../lib/events.js'
import { EVENT_STYLE } from '../../lib/eventStyle.js'

function Toast({ event, onClose, onOpen }) {
  const { icon: Icon, color, bg, bar } = EVENT_STYLE[event.type]
  const { title, detail } = describeEvent(event)

  // Se cierra solo a los 7 segundos
  useEffect(() => {
    const t = setTimeout(onClose, 7000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`toast-in flex items-start gap-3 rounded-xl border-l-4 bg-white p-3 shadow-lg ring-1 ring-black/5 ${bar}`}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${bg} ${color}`}>
          <Icon size={18} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-navy-700">{title}</span>
          <span className="block text-xs text-muted">{detail}</span>
        </span>
      </button>
      <button onClick={onClose} aria-label="Cerrar aviso" className="rounded-lg p-1 text-muted hover:bg-surface hover:text-navy-700">
        <X size={16} aria-hidden />
      </button>
    </div>
  )
}

export default function Toaster() {
  const { toasts, dismissToast } = useNotifications()
  const navigate = useNavigate()

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[calc(100%-2rem)] flex-col gap-2 sm:w-96"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast
            event={t}
            onClose={() => dismissToast(t.id)}
            onOpen={() => {
              dismissToast(t.id)
              navigate('/agenda', { state: { date: t.date } })
            }}
          />
        </div>
      ))}
    </div>
  )
}