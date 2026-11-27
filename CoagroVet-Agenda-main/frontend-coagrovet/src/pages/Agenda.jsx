import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { subscribe } from '../lib/events.js'  
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Button from '../components/Button.jsx'
import AppointmentCard from '../components/agenda/AppointmentCard.jsx'
import MonthCalendar from '../components/agenda/MonthCalendar.jsx'
import { STATUS } from '../components/agenda/StatusBadge.jsx'
import { getAppointmentsByDate, updateAppointmentStatus } from '../lib/api.js'
import { addDays, formatLongDate, isToday, toISODate } from '../lib/dates.js'

const FILTERS = ['todas', 'agendada', 'completada', 'cancelada']

export default function Agenda() {
  const location = useLocation()
  const [date, setDate] = useState(location.state?.date ?? toISODate(new Date()))
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('todas')
  const [busyId, setBusyId] = useState(null)
  const [reload, setReload] = useState(0)
  const [changes, setChanges] = useState(0) // avisa al calendario que hubo cambios
  
  // Al tocar un aviso, la agenda abre el día de esa cita
  useEffect(() => {
    if (location.state?.date) setDate(location.state.date)
  }, [location.state])

  // Si otra persona cambia algo, la agenda y el calendario se actualizan solos
  useEffect(
    () =>
      subscribe(() => {
        setReload((n) => n + 1)
        setChanges((n) => n + 1)
      }),
    []
  )

  // Carga las citas cada vez que cambia el día
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getAppointmentsByDate(date)
      .then((data) => !cancelled && setAppointments(data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [date, reload])

  async function handleChangeStatus(id, status) {
    setBusyId(id)
    try {
      const updated = await updateAppointmentStatus(id, status)
      setAppointments((list) =>
        list.map((a) => (a.id === id ? { ...a, status, history: updated.history } : a))
      )
      
      setChanges((n) => n + 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  function handleSelectFromCalendar(iso) {
    setDate(iso)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => a.time.localeCompare(b.time)),
    [appointments]
  )
  const visible = filter === 'todas' ? sorted : sorted.filter((a) => a.status === filter)
  const countOf = (f) => (f === 'todas' ? sorted.length : sorted.filter((a) => a.status === f).length)

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Citas programadas por día."
        action={
          <Link to="/agendar">
            <Button>
              <CalendarPlus size={18} />
              Agendar cita
            </Button>
          </Link>
        }
      />

      {/* Navegación por día */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="rounded-lg p-2 text-navy-700 hover:bg-surface"
            aria-label="Día anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setDate(addDays(date, 1))}
            className="rounded-lg p-2 text-navy-700 hover:bg-surface"
            aria-label="Día siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="mr-auto">
          <p className="font-bold text-navy-700">{formatLongDate(date)}</p>
          {isToday(date) && <p className="text-xs font-semibold text-brand-orange">Hoy</p>}
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="rounded-lg border border-black/10 bg-surface px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
          aria-label="Elegir fecha"
        />
        {!isToday(date) && (
          <Button variant="ghost" onClick={() => setDate(toISODate(new Date()))}>
            Ir a hoy
          </Button>
        )}
      </div>

      {/* Filtros por estado, con conteo */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f ? 'bg-navy-700 text-white' : 'bg-white text-navy-700 ring-1 ring-black/10 hover:bg-navy-100'
            }`}
          >
            {f === 'todas' ? 'Todas' : STATUS[f].label} · {countOf(f)}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <span>{error}. Revisa tu conexión e intenta de nuevo.</span>
          <Button variant="ghost" onClick={() => setReload((n) => n + 1)}>
            Reintentar
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <section className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
          <p className="font-bold text-navy-700">
            {filter === 'todas' ? 'No hay citas para este día' : 'No hay citas con este estado'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Agenda una cita nueva o cambia de día para ver otras.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              busy={busyId === a.id}
              onChangeStatus={handleChangeStatus}
            />
          ))}
        </div>
      )}

      {/* Calendario mensual al final de la agenda */}
      <MonthCalendar
        selectedDate={date}
        onSelect={handleSelectFromCalendar}
        refreshKey={changes}
      />
    </>
  )
}