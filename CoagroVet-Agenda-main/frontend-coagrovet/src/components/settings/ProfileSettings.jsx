import { useEffect, useState } from 'react'
import { getMyProfile } from '../../lib/auth.js'
import { formatStamp } from '../../lib/dates.js'

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function Item({ label, children }) {
  return (
    <div className="py-1.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{children || '—'}</dd>
    </div>
  )
}

export default function ProfileSettings() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMyProfile().then(setProfile).catch((e) => setError(e.message))
  }, [])

  return (
    <section className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <h2 className="text-lg font-extrabold text-navy-700">Perfil</h2>
      <p className="text-sm text-muted">La información de la cuenta con la que iniciaste sesión.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}.</p>}

      {!profile && !error && <div className="mt-4 h-32 animate-pulse rounded-xl bg-surface" aria-busy="true" />}

      {profile && (
        <>
          <div className="mt-5 flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-navy-700 text-lg font-bold text-white">
              {initials(profile.name)}
            </span>
            <div>
              <p className="text-lg font-bold text-navy-700">{profile.name}</p>
              <p className="text-sm text-muted">{profile.role === 'admin' ? 'Administrador' : 'Empleado'}</p>
            </div>
          </div>

          <dl className="mt-4 grid gap-x-6 rounded-lg bg-surface p-4 sm:grid-cols-2">
            <Item label="Número de identidad">{profile.dni}</Item>
            <Item label="Teléfono">{profile.phone}</Item>
            <Item label="Correo">{profile.email}</Item>
            <Item label="Usuario">{profile.username}</Item>
            <Item label="Cuenta creada">
              {formatStamp(profile.createdAt)}
              {profile.createdBy ? ` · por ${profile.createdBy}` : ''}
            </Item>
            <Item label="Sesión iniciada">{profile.sessionSince ? formatStamp(profile.sessionSince) : null}</Item>
          </dl>

          <p className="mt-3 text-xs text-muted">
            Si algún dato está incorrecto o falta, pídele al administrador que lo actualice.
          </p>
        </>
      )}
    </section>
  )
}