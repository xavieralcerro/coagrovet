import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge, { STATUS } from '../components/agenda/StatusBadge.jsx'
import { getAccessLog, getReport } from '../lib/api.js'
import {
  addDays, formatDuration, formatShortDate, formatStamp, formatTime, fromISODate, toISODate,
} from '../lib/dates.js'

const today = () => toISODate(new Date())
const monthRange = (offset) => {
  const n = new Date()
  return [
    toISODate(new Date(n.getFullYear(), n.getMonth() + offset, 1)),
    toISODate(new Date(n.getFullYear(), n.getMonth() + offset + 1, 0)),
  ]
}

const PRESETS = [
  { id: 'today', label: 'Hoy', range: () => [today(), today()] },
  { id: '7', label: 'Últimos 7 días', range: () => [addDays(today(), -6), today()] },
  { id: '30', label: 'Últimos 30 días', range: () => [addDays(today(), -29), today()] },
  { id: 'month', label: 'Este mes', range: () => monthRange(0) },
  { id: 'lastMonth', label: 'Mes pasado', range: () => monthRange(-1) },
  { id: 'custom', label: 'Personalizado', range: null },
]

const TABS = ['todas', 'agendada', 'completada', 'cancelada']

function Card({ title, subtitle, children }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="font-extrabold text-navy-700">{title}</h2>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function StatCard({ label, value, hint, accent = 'text-navy-700' }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

const Empty = ({ children }) => <p className="rounded-lg bg-surface p-4 text-sm text-muted">{children}</p>

function DailyChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.agendada + d.completada + d.cancelada))
  const showLabels = days.length <= 31
  const height = (n) => `${(n / max) * 100}%`

  return (
    <>
      <div className="overflow-x-auto pb-1">
        <div className="flex items-end gap-1" style={{ minWidth: days.length * 18 }}>
          {days.map((d) => {
            const total = d.agendada + d.completada + d.cancelada
            return (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${formatShortDate(d.date)}: ${total} ${total === 1 ? 'cita' : 'citas'}`}
              >
                <div className="flex h-40 w-full flex-col-reverse">
                  <div className="bg-emerald-500" style={{ height: height(d.completada) }} />
                  <div className="bg-navy-600" style={{ height: height(d.agendada) }} />
                  <div className="bg-red-500" style={{ height: height(d.cancelada) }} />
                </div>
                {showLabels && <span className="text-[10px] text-muted">{Number(d.date.slice(-2))}</span>}
              </div>
            )
          })}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-navy-600" />Agendadas</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Completadas</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Canceladas</li>
      </ul>
    </>
  )
}

const th = 'px-3 py-2 text-left text-xs font-semibold text-muted'
const td = 'px-3 py-3 align-top text-sm'

export default function Informes() {
  const [preset, setPreset] = useState('30')
  const [from, setFrom] = useState(addDays(today(), -29))
  const [to, setTo] = useState(today())
  const [report, setReport] = useState(null)
  const [access, setAccess] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('todas')
  const [shown, setShown] = useState(25)

  const span = Math.round((fromISODate(to) - fromISODate(from)) / 86400000)
  const rangeError = from > to ? 'La fecha inicial debe ser anterior a la final.' : span > 366 ? 'Elige un rango de máximo 1 año.' : null

  useEffect(() => {
    if (rangeError) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getReport(from, to), getAccessLog(from, to)])
      .then(([r, a]) => {
        if (cancelled) return
        setReport(r)
        setAccess(a)
        setShown(25)
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [from, to, rangeError])

  function pickPreset(p) {
    setPreset(p.id)
    if (p.range) {
      const [f, t] = p.range()
      setFrom(f)
      setTo(t)
    }
  }

  const totals = report?.totals
  const list = report ? report.appointments.filter((a) => tab === 'todas' || a.status === tab) : []
  const maxService = Math.max(1, ...(report?.services.map((s) => s.count) ?? [1]))
  const people = Object.values(
    access.reduce((acc, e) => {
      const p = (acc[e.userId] ||= { name: e.name, role: e.role, count: 0, last: e.loginAt })
      p.count += 1
      if (e.loginAt > p.last) p.last = e.loginAt
      return acc
    }, {})
  )
  const roleLabel = (r) => (r === 'admin' ? 'Administrador' : 'Empleado')
  const countOf = (t) => (t === 'todas' ? totals.total : totals[t])

  return (
    <>
      <PageHeader title="Informes" description="Cómo va la empresa en el periodo que elijas." />

      {/* Periodo */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => pickPreset(p)}
              aria-pressed={preset === p.id}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                preset === p.id ? 'bg-navy-700 text-white' : 'bg-surface text-navy-700 hover:bg-navy-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold text-navy-700">
              Desde
              <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)}
                className="mt-1 block rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand-orange focus:outline-none" />
            </label>
            <label className="text-sm font-semibold text-navy-700">
              Hasta
              <input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)}
                className="mt-1 block rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand-orange focus:outline-none" />
            </label>
          </div>
        )}
        <p className="mt-3 text-sm text-muted">
          Del <strong className="text-navy-700">{formatShortDate(from)}</strong> al{' '}
          <strong className="text-navy-700">{formatShortDate(to)}</strong>
        </p>
        {rangeError && <p className="mt-2 text-sm font-medium text-red-600">{rangeError}</p>}
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}.</p>}

      {!report || rangeError ? (
        !rangeError && <div className="h-48 animate-pulse rounded-xl bg-white/70" aria-busy="true" />
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total de citas" value={totals.total} />
            <StatCard label="Completadas" value={totals.completada} accent="text-emerald-600" />
            <StatCard label="Canceladas" value={totals.cancelada} accent="text-red-600" hint={`${totals.cancelRate}% del total`} />
            <StatCard label="Agendadas" value={totals.agendada} hint="Aún sin completar" />
            <StatCard label="Clientes nuevos" value={totals.newOwners} accent="text-brand-orange-dark" />
            <StatCard label="Mascotas nuevas" value={totals.newPets} accent="text-brand-orange-dark" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Citas por día" subtitle="Colores según el estado de cada cita.">
              {totals.total === 0 ? <Empty>No hay citas en este periodo.</Empty> : <DailyChart days={report.days} />}
            </Card>

            <Card title="Servicios más solicitados" subtitle="No incluye las citas canceladas.">
              {report.services.length === 0 ? (
                <Empty>Aún no hay servicios solicitados en este periodo.</Empty>
              ) : (
                <ul className="space-y-3">
                  {report.services.map((s) => (
                    <li key={s.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-navy-700">{s.name}</span>
                        <span className="text-muted">{s.count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-surface">
                        <div className="h-2.5 rounded-full bg-brand-orange" style={{ width: `${(s.count / maxService) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Personal */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Actividad del personal" subtitle="Quién agendó, completó o canceló las citas del periodo.">
              {report.staff.length === 0 ? (
                <Empty>Sin actividad registrada en este periodo.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr><th className={th}>Usuario</th><th className={th}>Agendó</th><th className={th}>Completó</th><th className={th}>Canceló</th></tr></thead>
                    <tbody className="divide-y divide-black/5">
                      {report.staff.map((s) => (
                        <tr key={s.name}>
                          <td className={`${td} font-semibold text-navy-700`}>{s.name}</td>
                          <td className={td}>{s.agendadas}</td>
                          <td className={td}>{s.completadas}</td>
                          <td className={td}>{s.canceladas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Accesos al sistema" subtitle="Cuándo entró cada persona al sistema.">
              {people.length === 0 ? (
                <Empty>Nadie ha iniciado sesión en este periodo.</Empty>
              ) : (
                <ul className="divide-y divide-black/5">
                  {people.map((p) => (
                    <li key={p.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-navy-700">{p.name}</p>
                        <p className="text-xs text-muted">{roleLabel(p.role)}</p>
                      </div>
                      <p className="text-right text-xs text-muted">
                        {p.count} {p.count === 1 ? 'acceso' : 'accesos'}
                        <span className="block">Último: {formatStamp(p.last)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Detalle de accesos */}
          {access.length > 0 && (
            <Card title="Detalle de accesos">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className={th}>Usuario</th><th className={th}>Rol</th><th className={th}>Entrada</th><th className={th}>Salida</th><th className={th}>Duración</th></tr></thead>
                  <tbody className="divide-y divide-black/5">
                    {access.slice(0, 30).map((e) => {
                      const min = e.logoutAt ? Math.round((new Date(e.logoutAt) - new Date(e.loginAt)) / 60000) : null
                      return (
                        <tr key={e.id}>
                          <td className={`${td} font-semibold text-navy-700`}>{e.name}</td>
                          <td className={td}>{roleLabel(e.role)}</td>
                          <td className={td}>{formatStamp(e.loginAt)}</td>
                          <td className={td}>{e.logoutAt ? formatStamp(e.logoutAt) : 'Sin cierre'}</td>
                          <td className={td}>{min == null ? '—' : min < 1 ? 'Menos de 1 min' : formatDuration(min)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {access.length > 30 && <p className="mt-3 text-xs text-muted">Mostrando los 30 accesos más recientes de {access.length}.</p>}
            </Card>
          )}

          {/* Listado de citas */}
          <Card title="Citas del periodo" subtitle="Quién agendó cada cita y quién la completó o canceló.">
            <div className="mb-4 flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setShown(25) }}
                  aria-pressed={tab === t}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    tab === t ? 'bg-navy-700 text-white' : 'bg-surface text-navy-700 hover:bg-navy-100'
                  }`}
                >
                  {t === 'todas' ? 'Todas' : STATUS[t].label} · {countOf(t)}
                </button>
              ))}
            </div>

            {list.length === 0 ? (
              <Empty>No hay citas con este estado en el periodo.</Empty>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr>
                        <th className={th}>Fecha y hora</th><th className={th}>Mascota y dueño</th><th className={th}>Servicios</th>
                        <th className={th}>Estado</th><th className={th}>Agendó</th><th className={th}>Completó o canceló</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {list.slice(0, shown).map((a) => {
                        const created = a.history?.[0]
                        const last = a.history?.length > 1 ? a.history[a.history.length - 1] : null
                        return (
                          <tr key={a.id}>
                            <td className={td}>{formatShortDate(a.date)}<span className="block text-xs text-muted">{formatTime(a.time)}</span></td>
                            <td className={td}><span className="font-semibold text-navy-700">{a.patient}</span><span className="block text-xs text-muted">{a.client}</span></td>
                            <td className={td}>{a.service}</td>
                            <td className={td}><StatusBadge status={a.status} /></td>
                            <td className={td}>{created ? created.by.name : 'Sin registro'}</td>
                            <td className={td}>{last ? <>{last.by.name}<span className="block text-xs text-muted">{formatStamp(last.at)}</span></> : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {list.length > shown && (
                  <button onClick={() => setShown((n) => n + 25)} className="mt-4 text-sm font-semibold text-brand-orange-dark hover:underline">
                    Ver más ({list.length - shown} restantes)
                  </button>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </>
  )
}