import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../Button.jsx'
import { getAppointmentsByMonth } from '../../lib/api.js'
import { fromISODate, formatMonthYear, formatTime, monthMatrix, toISODate } from '../../lib/dates.js'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const DOT = {
  agendada: 'bg-navy-600' ,
  completada: 'bg-emerald-500',
  cancelada: 'bg-red-500',
}

export default function MonthCalendar({ selectedDate, onSelect, refreshKey = 0 }) {
  const initial = fromISODate(selectedDate)
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [byDay, setByDay] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reload, setReload] = useState(0)

  const today = toISODate(new Date())
  const monthKey = `${view.year}-${String(view.month + 1).padStart(2, '0')}`

  // Si se elige un día de otro mes desde la agenda, el calendario lo sigue
  useEffect(() => {
    const d = fromISODate(selectedDate)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }, [selectedDate])

  // Carga las citas del mes visible
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getAppointmentsByMonth(monthKey)
      .then((data) => !cancelled && setByDay(data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [monthKey, refreshKey, reload])

  const cells = useMemo(() => monthMatrix(view.year, view.month), [view])
  const totalMonth = Object.values(byDay).reduce((sum, list) => sum + list.length, 0)

  function moveMonth(step) {
    const d = new Date(view.year, view.month + step, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  function goToCurrentMonth() {
    const now = new Date()
    setView({ year: now.getFullYear(), month: now.getMonth() })
  }

  return (
    <section className="mt-10 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6" aria-label="Calendario mensual">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-extrabold text-navy-700">{formatMonthYear(view.year, view.month)}</h2>
          <p className="text-sm text-muted">
            {loading ? 'Cargando citas del mes…' : `${totalMonth} ${totalMonth === 1 ? 'cita' : 'citas'} en el mes`}
          </p>
        </div>
        <Button variant="ghost" onClick={goToCurrentMonth}>
          Mes actual
        </Button>
        <div className="flex items-center gap-1">
          <button onClick={() => moveMonth(-1)} className="rounded-lg p-2 text-navy-700 hover:bg-surface" aria-label="Mes anterior">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => moveMonth(1)} className="rounded-lg p-2 text-navy-700 hover:bg-surface" aria-label="Mes siguiente">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <span>{error}.</span>
          <Button variant="ghost" onClick={() => setReload((n) => n + 1)}>
            Reintentar
          </Button>
        </div>
      )}

      <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-semibold text-muted">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`empty-${i}`} className="rounded-lg bg-surface/50" />

            const list = byDay[iso] ?? []
            const isSelected = iso === selectedDate
            const isToday = iso === today
            const dayNumber = Number(iso.slice(-2))

            return (
              <button
                key={iso}
                onClick={() => onSelect(iso)}
                aria-label={`${dayNumber}, ${list.length} citas`}
                aria-pressed={isSelected}
                className={`flex min-h-[4.5rem] flex-col items-stretch gap-1 rounded-lg p-1.5 text-left transition-colors sm:min-h-[6.5rem] sm:p-2 ${
                  isSelected ? 'bg-navy-700 text-white' : 'bg-surface hover:bg-navy-100'
                } ${isToday && !isSelected ? 'ring-2 ring-brand-orange' : ''}`}
              >
                <span className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isToday && !isSelected ? 'text-brand-orange-dark' : ''}`}>
                    {dayNumber}
                  </span>
                  {list.length > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-xs font-bold sm:hidden ${
                        isSelected ? 'bg-white text-navy-700' : 'bg-brand-orange text-white'
                      }`}
                    >
                      {list.length}
                    </span>
                  )}
                </span>

                {/* En pantallas grandes se muestran las primeras citas del día */}
                <span className="hidden flex-col gap-1 sm:flex">
                  {list.slice(0, 2).map((a) => (
                    <span
                      key={a.id}
                      className={`flex items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        isSelected ? 'bg-white/15' : 'bg-white'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[a.status] ?? DOT.agendada}`} />
                      <span className="truncate">
                        {formatTime(a.time)} {a.patient}
                      </span>
                    </span>
                  ))}
                  {list.length > 2 && (
                    <span className={`px-1.5 text-[11px] font-semibold ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                      +{list.length - 2} más
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {[
          ['agendada', 'Agendada'],
          
          ['completada', 'Completada'],
          ['cancelada', 'Cancelada'],
        ].map(([key, label]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${DOT[key]}`} />
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}