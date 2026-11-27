import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '../../context/NotificationsContext.jsx'
import { describeEvent } from '../../lib/events.js'
import { EVENT_STYLE } from '../../lib/eventStyle.js'
import { formatStamp } from '../../lib/dates.js'

export default function NotificationBell() {
  const { items, unread, lastRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  function close() {
    setOpen(false)
    if (unread > 0) markAllRead() // al cerrar, todo queda como leído
  }

  // Cierra con clic fuera o con Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && close()
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  })

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-navy-700 hover:bg-surface"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 z-30 max-h-[70vh] overflow-y-auto rounded-xl bg-white shadow-xl ring-1 ring-black/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="border-b border-black/5 px-4 py-3">
            <h2 className="font-extrabold text-navy-700">Avisos</h2>
            <p className="text-xs text-muted">Lo que hicieron otras personas en la agenda.</p>
          </div>

          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">
              Aún no hay avisos. Aquí verás cuándo otra persona agende, complete o cancele una cita.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {items.slice(0, 20).map((ev) => {
                const { icon: Icon, color, bg } = EVENT_STYLE[ev.type]
                const { title, detail } = describeEvent(ev)
                const isNew = ev.at > lastRead
                return (
                  <li key={ev.id}>
                    <button
                      onClick={() => {
                        close()
                        navigate('/agenda', { state: { date: ev.date } })
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-navy-100 ${
                        isNew ? 'bg-brand-orange-soft/50' : ''
                      }`}
                    >
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${bg} ${color}`}>
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy-700">{title}</span>
                        <span className="block text-xs text-muted">{detail}</span>
                        <span className="mt-0.5 block text-xs text-muted/80">{formatStamp(ev.at)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}