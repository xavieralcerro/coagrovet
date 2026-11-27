import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CalendarPlus, Clock, Scissors } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Button from '../components/Button.jsx'
import { APPOINTMENT_DURATION, CATEGORY, CLINIC_HOURS } from '../lib/services.js'
import { getServices } from '../lib/api.js'
import { getServiceIcon } from '../lib/serviceIcons.js'
import { formatDuration } from '../lib/dates.js'

function InfoItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-orange-soft text-brand-orange-dark">
        <Icon size={20} aria-hidden />
      </span>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold text-navy-700">{children}</p>
      </div>
    </div>
  )
}

export default function Servicios() {
  const [services, setServices] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getServices().then(setServices).catch((e) => setError(e.message))
  }, [])

  return (
    <>
      <PageHeader
        title="Servicios"
        description={`Lo que ofrecemos en ${CATEGORY}.`}
        action={
          <Link to="/agendar">
            <Button>
              <CalendarPlus size={18} aria-hidden /> Agendar cita
            </Button>
          </Link>
        }
      />

      <section className="mb-6 grid gap-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:grid-cols-3">
        <InfoItem icon={CalendarDays} label="Horario de atención">{CLINIC_HOURS}</InfoItem>
        <InfoItem icon={Clock} label="Tiempo reservado por cita">{formatDuration(APPOINTMENT_DURATION)}</InfoItem>
        <InfoItem icon={Scissors} label="Varios servicios en una cita">Puedes combinar los que necesites</InfoItem>
      </section>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}.</p>}

      {!services ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-muted shadow-sm ring-1 ring-black/5">
          Por ahora no hay servicios disponibles.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = getServiceIcon(s.icon)
            return (
              <article key={s.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-700 text-white">
                  <Icon size={22} aria-hidden />
                </span>
                <h2 className="mt-4 font-extrabold text-navy-700">{s.name}</h2>
                <p className="mt-1 text-sm text-muted">{s.description}</p>
              </article>
            )
          })}
        </div>
      )}

      <p className="mt-6 text-sm text-muted">
        ¿No sabes cuál servicio elegir? Al agendar la cita puedes dejar tus indicaciones y te orientamos.
      </p>
    </>
  )
}