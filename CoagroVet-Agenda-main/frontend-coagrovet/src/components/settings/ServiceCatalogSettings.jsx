import { useEffect, useState } from 'react'
import { Pencil, Plus, Power, Trash2 } from 'lucide-react'
import Button from '../Button.jsx'
import ConfirmDialog from '../ConfirmDialog.jsx'
import Field, { inputClass } from '../agendar/Field.jsx'
import { createService, deleteService, getServices, setServiceActive, updateService } from '../../lib/api.js'
import { ICON_OPTIONS, getServiceIcon } from '../../lib/serviceIcons.js'

const EMPTY = { name: '', description: '', icon: 'paw' }

function ServiceForm({ mode, initial, onSubmit, onCancel }) {
  const editing = mode === 'edit'
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function validate() {
    const e = {}
    if (form.name.trim().length < 3) e.name = 'Escribe el nombre del servicio (mínimo 3 letras).'
    if (form.description.trim().length < 10) e.description = 'Escribe una descripción breve (mínimo 10 caracteres).'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setSubmitError(null)
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit(form)
    } catch (e) {
      setSubmitError(e.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl bg-surface p-4 sm:p-5">
      <h4 className="font-bold text-navy-700">{editing ? 'Editar servicio' : 'Nuevo servicio'}</h4>
      <div className="mt-4 grid gap-4">
        <Field
          label="Nombre del servicio"
          required
          error={errors.name}
          hint={editing ? 'Las citas anteriores conservan el nombre con el que se agendaron.' : undefined}
        >
          <input className={inputClass} value={form.name} onChange={set('name')} autoComplete="off" />
        </Field>
        <Field label="En qué consiste" required error={errors.description} hint="Es lo que ven los empleados en la sección Servicios.">
          <textarea className={inputClass} rows={3} value={form.description} onChange={set('description')} />
        </Field>
        <div>
          <span className="text-sm font-semibold text-navy-700">Ícono</span>
          <div role="radiogroup" aria-label="Ícono del servicio" className="mt-2 flex flex-wrap gap-2">
            {ICON_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={form.icon === key}
                aria-label={label}
                title={label}
                onClick={() => setForm((f) => ({ ...f, icon: key }))}
                className={`grid h-10 w-10 place-items-center rounded-lg ring-1 transition-colors ${
                  form.icon === key ? 'bg-navy-700 text-white ring-navy-700' : 'bg-white text-navy-700 ring-black/10 hover:bg-navy-100'
                }`}
              >
                <Icon size={18} aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      {submitError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{submitError}.</p>}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Añadir servicio'}
        </Button>
      </div>
    </form>
  )
}

export default function ServiceCatalogSettings() {
  const [services, setServices] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    getServices({ includeInactive: true }).then(setServices).catch((e) => setError(e.message))
  }, [reload])

  async function handleCreate(data) {
    const created = await createService(data)
    setNotice(`El servicio «${created.name}» ya está disponible para agendar.`)
    setShowCreate(false)
    setReload((n) => n + 1)
  }

  async function handleUpdate(id, data) {
    const updated = await updateService(id, data)
    setNotice(`Se guardaron los cambios de «${updated.name}».`)
    setEditingId(null)
    setReload((n) => n + 1)
  }

  async function toggleActive(service) {
    setError(null)
    setNotice(null)
    try {
      await setServiceActive(service.id, !service.active)
      setNotice(
        service.active
          ? `«${service.name}» se desactivó: ya no aparece al agendar.`
          : `«${service.name}» se activó de nuevo.`
      )
      setReload((n) => n + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete() {
    const target = toDelete
    setToDelete(null)
    setError(null)
    try {
      await deleteService(target.id)
      setNotice(`El servicio «${target.name}» fue eliminado.`)
      setReload((n) => n + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-navy-700">Catálogo de servicios</h2>
          <p className="text-sm text-muted">Los servicios que se pueden elegir al agendar una cita.</p>
        </div>
        {!showCreate && (
          <Button onClick={() => { setShowCreate(true); setNotice(null) }}>
            <Plus size={18} aria-hidden /> Añadir servicio
          </Button>
        )}
      </div>

      {notice && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}.</p>}

      {showCreate && (
        <ServiceForm mode="create" initial={EMPTY} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
      )}

      <div className="mt-6">
        {!services ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface" aria-busy="true" />
        ) : (
          <ul className="divide-y divide-black/5">
            {services.map((s) => {
              const Icon = getServiceIcon(s.icon)
              return (
                <li key={s.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className={`flex min-w-0 flex-1 items-start gap-3 ${s.active ? '' : 'opacity-60'}`}>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-700 text-white">
                        <Icon size={18} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-navy-700">
                          {s.name}{' '}
                          <span
                            className={`ml-1 rounded-full px-2 py-0.5 align-middle text-xs font-semibold ${
                              s.active ? 'bg-emerald-100 text-emerald-800' : 'bg-surface text-muted'
                            }`}
                          >
                            {s.active ? 'Activo' : 'Desactivado'}
                          </span>
                        </p>
                        <p className="text-sm text-muted">{s.description}</p>
                        <p className="mt-1 text-xs text-muted">
                          {s.uses === 0 ? 'Aún sin citas' : `Usado en ${s.uses} ${s.uses === 1 ? 'cita' : 'citas'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => { setEditingId(s.id); setNotice(null) }}>
                        <Pencil size={16} aria-hidden /> Editar
                      </Button>
                      <Button variant="ghost" onClick={() => toggleActive(s)}>
                        <Power size={16} aria-hidden /> {s.active ? 'Desactivar' : 'Activar'}
                      </Button>
                      {s.uses === 0 && (
                        <Button variant="ghost" onClick={() => setToDelete(s)}>
                          <Trash2 size={16} aria-hidden /> Eliminar
                        </Button>
                      )}
                    </div>
                  </div>

                  {editingId === s.id && (
                    <ServiceForm
                      mode="edit"
                      initial={{ name: s.name, description: s.description, icon: s.icon }}
                      onSubmit={(data) => handleUpdate(s.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">
          Un servicio desactivado no aparece al agendar ni en la sección Servicios, pero se conserva en el historial.
          Solo se puede eliminar un servicio que nunca se haya usado.
        </p>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar este servicio?"
        message={`«${toDelete?.name}» se borrará del catálogo. Como nunca se usó en una cita, no afecta ningún historial.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Volver"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  )
}