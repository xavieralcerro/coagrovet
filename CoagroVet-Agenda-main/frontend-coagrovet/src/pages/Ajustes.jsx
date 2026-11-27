import { useEffect, useState } from 'react'
import { ChevronDown, Pencil, Trash2, UserPlus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Button from '../components/Button.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import AppearanceSettings from '../components/settings/AppearanceSettings.jsx'
import ServiceCatalogSettings from '../components/settings/ServiceCatalogSettings.jsx'
import ProfileSettings from '../components/settings/ProfileSettings.jsx'
import Field, { inputClass } from '../components/agendar/Field.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  createEmployee, deleteEmployee, getEmployees, updateEmployee,
} from '../lib/auth.js'
import { formatStamp } from '../lib/dates.js'

const EMPTY = { name: '', username: '', dni: '', phone: '', email: '', password: '' }
const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function Item({ label, children }) {
  return (
    <div className="py-1.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{children || '—'}</dd>
    </div>
  )
}

// Formulario para crear (mode="create") o editar (mode="edit") un empleado
function EmployeeForm({ mode, initial, onSubmit, onCancel }) {
  const editing = mode === 'edit'
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Escribe el nombre completo.'
    if (!/^[a-z0-9._-]{3,}$/i.test(form.username.trim())) e.username = 'Usa al menos 3 letras o números, sin espacios.'
    if (!form.dni.trim()) e.dni = 'El número de identidad es obligatorio.'
    if (form.phone.replace(/\D/g, '').length < 8) e.phone = 'Escribe un teléfono de al menos 8 dígitos.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Revisa el formato del correo.'
    if ((!editing || form.password) && form.password.length < 6) {
      e.password = 'La contraseña debe tener al menos 6 caracteres.'
    }
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
    <form onSubmit={handleSubmit} className="mt-5 rounded-xl bg-surface p-4 sm:p-5">
      <h3 className="font-bold text-navy-700">{editing ? 'Editar empleado' : 'Nuevo empleado'}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" required error={errors.name} className="sm:col-span-2">
          <input className={inputClass} value={form.name} onChange={set('name')} autoComplete="off" />
        </Field>
        <Field label="Número de identidad" required error={errors.dni}>
          <input className={inputClass} value={form.dni} onChange={set('dni')} autoComplete="off" />
        </Field>
        <Field label="Teléfono o WhatsApp" required error={errors.phone}>
          <input className={inputClass} value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="9999-9999" autoComplete="off" />
        </Field>
        <Field label="Correo electrónico" error={errors.email} hint="Opcional" className="sm:col-span-2">
          <input className={inputClass} type="email" value={form.email} onChange={set('email')} autoComplete="off" />
        </Field>
        <Field label="Usuario para entrar" required error={errors.username} hint="Ej. maria.lopez. No se puede repetir.">
          <input className={inputClass} value={form.username} onChange={set('username')} autoComplete="off" />
        </Field>
        <Field
          label={editing ? 'Nueva contraseña' : 'Contraseña asignada'}
          required={!editing}
          error={errors.password}
          hint={editing ? 'Déjala vacía para conservar la actual.' : 'Mínimo 6 caracteres. Entrégasela al empleado.'}
        >
          <PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
      </div>

      {submitError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{submitError}.</p>}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  )
}

export default function Ajustes() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [reload, setReload] = useState(0)

  const isAdmin = user.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    getEmployees().then(setEmployees).catch((e) => setError(e.message))
  }, [isAdmin, reload])

  // Empleados: solo ven la apariencia
  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Ajustes" description="Configuración del sistema." />
        <ProfileSettings />
        <AppearanceSettings />
      </>
    )
  }

  async function handleCreate(data) {
    const created = await createEmployee(data)
    setNotice(`Cuenta creada para ${created.name}. Ya puede entrar con el usuario «${created.username}».`)
    setShowCreate(false)
    setReload((n) => n + 1)
  }

  async function handleUpdate(id, data) {
    const updated = await updateEmployee(id, data)
    setNotice(`La información de ${updated.name} fue actualizada.`)
    setEditingId(null)
    setReload((n) => n + 1)
  }

  async function handleDelete() {
    const target = toDelete
    setToDelete(null)
    try {
      await deleteEmployee(target.id)
      setNotice(`La cuenta de ${target.name} fue eliminada.`)
      if (expanded === target.id) setExpanded(null)
      if (editingId === target.id) setEditingId(null)
      setReload((n) => n + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <PageHeader title="Ajustes" description="Configuración del sistema." />

      <AppearanceSettings />

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-navy-700">Ajustes de cuentas</h2>
            <p className="text-sm text-muted">Crea, edita o quita las cuentas de los empleados que usan el sistema.</p>
          </div>
          {!showCreate && (
            <Button onClick={() => { setShowCreate(true); setNotice(null) }}>
              <UserPlus size={18} aria-hidden /> Añadir empleado
            </Button>
          )}
        </div>

        {notice && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}.</p>}

        {showCreate && (
          <EmployeeForm mode="create" initial={EMPTY} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted">
            Empleados{employees ? ` · ${employees.length}` : ''}
          </h3>

          {!employees ? (
            <div className="mt-3 h-24 animate-pulse rounded-xl bg-surface" aria-busy="true" />
          ) : employees.length === 0 ? (
            <p className="mt-3 rounded-lg bg-surface p-4 text-sm text-muted">
              No hay empleados registrados. Pulsa «Añadir empleado» para crear la primera cuenta.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-black/5">
              {employees.map((emp) => {
                const open = expanded === emp.id
                const editing = editingId === emp.id
                return (
                  <li key={emp.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-700 text-sm font-bold text-white">
                          {initials(emp.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-navy-700">{emp.name}</p>
                          <p className="text-xs text-muted">Usuario: {emp.username}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => { setExpanded(open ? null : emp.id); setEditingId(null) }}
                          aria-expanded={open}
                        >
                          <ChevronDown size={16} aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                          {open ? 'Ocultar' : 'Ver información'}
                        </Button>
                        <Button variant="ghost" onClick={() => { setEditingId(emp.id); setExpanded(emp.id); setNotice(null) }}>
                          <Pencil size={16} aria-hidden /> Editar
                        </Button>
                        <Button variant="ghost" onClick={() => setToDelete(emp)}>
                          <Trash2 size={16} aria-hidden /> Quitar
                        </Button>
                      </div>
                    </div>

                    {editing ? (
                      <EmployeeForm
                        mode="edit"
                        initial={{ name: emp.name, username: emp.username, dni: emp.dni, phone: emp.phone, email: emp.email, password: '' }}
                        onSubmit={(data) => handleUpdate(emp.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      open && (
                        <dl className="mt-4 grid gap-x-6 rounded-lg bg-surface p-4 sm:grid-cols-2">
                          <Item label="Nombre completo">{emp.name}</Item>
                          <Item label="Número de identidad">{emp.dni}</Item>
                          <Item label="Teléfono">{emp.phone}</Item>
                          <Item label="Correo">{emp.email}</Item>
                          <Item label="Usuario">{emp.username}</Item>
                          <Item label="Último acceso">{emp.lastLogin ? formatStamp(emp.lastLogin) : 'Aún no ha entrado'}</Item>
                          <Item label="Cuenta creada">{formatStamp(emp.createdAt)}{emp.createdBy ? ` · por ${emp.createdBy}` : ''}</Item>
                          <Item label="Última edición">{emp.updatedAt ? `${formatStamp(emp.updatedAt)} · por ${emp.updatedBy}` : null}</Item>
                        </dl>
                      )
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
      
      <ServiceCatalogSettings />

      <ConfirmDialog
        open={!!toDelete}
        title="¿Quitar esta cuenta?"
        message={`${toDelete?.name} ya no podrá iniciar sesión. Las citas que agendó o atendió se conservan con su nombre.`}
        confirmLabel="Sí, quitar cuenta"
        cancelLabel="Volver"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}