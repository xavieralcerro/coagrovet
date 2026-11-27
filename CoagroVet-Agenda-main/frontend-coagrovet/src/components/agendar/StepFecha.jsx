import { useEffect, useState } from 'react'
import Button from '../Button.jsx'
import { getAvailableSlots } from '../../lib/api.js'
import { formatDuration, formatLongDate, formatTime, toISODate } from '../../lib/dates.js'

export default function StepFecha({ date, time, duration, onDate, onTime, error }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reload, setReload] = useState(0)

  const today = toISODate(new Date())
  const now = new Date()
  const nowMin = date === today ? now.getHours() * 60 + now.getMinutes() : -1

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    getAvailableSlots(date, duration)
      .then((data) => !cancelled && setSlots(data))
      .catch((e) => !cancelled && setLoadError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [date, duration, reload])

  const isPast = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m <= nowMin
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold text-navy-700">Fecha y hora</h2>
      <p className="mb-4 text-sm text-muted">
        Cada cita reserva {formatDuration(duration)}. Elige la hora de inicio.
      </p>

      <label className="block max-w-xs">
        <span className="text-sm font-semibold text-navy-700">Día de la cita</span>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => e.target.value && onDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
        />
      </label>
      <p className="mt-2 text-sm font-medium text-navy-700">{formatLongDate(date)}</p>

      <div className="mt-5">
        {loadError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <span>{loadError}.</span>
            <Button variant="ghost" onClick={() => setReload((n) => n + 1)}>Reintentar</Button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5" aria-busy="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="rounded-lg bg-surface p-4 text-sm text-muted">No hay horarios disponibles este día. Prueba con otra fecha.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {slots.map((s) => {
              const disabled = !s.available || isPast(s.time)
              const active = time === s.time
              return (
                <button
                  key={s.time}
                  type="button"
                  disabled={disabled}
                  onClick={() => onTime(s.time)}
                  aria-pressed={active}
                  className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-brand-orange text-white'
                      : disabled
                        ? 'cursor-not-allowed bg-surface text-muted/50 line-through'
                        : 'bg-white text-navy-700 ring-1 ring-black/10 hover:bg-navy-100'
                  }`}
                >
                  {formatTime(s.time)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}