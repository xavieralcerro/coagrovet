import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import Field, { inputClass } from './Field.jsx'
import Button from '../Button.jsx'
import { searchOwners } from '../../lib/api.js'
import { currentAgeMonths, formatAgeMonths } from '../../lib/dates.js'

const SPECIES = ['Perro', 'Gato', 'Conejo', 'Otro']
const SEX = ['Macho', 'Hembra']
const TEMPERAMENT = ['Tranquilo', 'Nervioso', 'Reactivo o agresivo']

function PetForm({ pet, setPet, errors }) {
  const p = (key) => (e) => setPet((v) => ({ ...v, [key]: e.target.value }))
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Nombre de la mascota" required error={errors.petName}>
        <input className={inputClass} value={pet.name} onChange={p('name')} />
      </Field>
      <Field label="Especie" required>
        <select className={inputClass} value={pet.species} onChange={p('species')}>
          {SPECIES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Raza">
        <input className={inputClass} value={pet.breed} onChange={p('breed')} placeholder="Ej. Poodle, mestizo" />
      </Field>
      <Field label="Sexo">
        <select className={inputClass} value={pet.sex} onChange={p('sex')}>
          <option value="">Sin indicar</option>
          {SEX.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>

      <div>
        <span className="text-sm font-semibold text-navy-700">Edad</span>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            aria-label="Edad (número)"
            value={pet.ageValue}
            onChange={p('ageValue')}
            placeholder="Ej. 3"
            className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm placeholder:text-muted/70 focus:border-brand-orange focus:outline-none"
          />
          <select
            aria-label="Unidad de la edad"
            value={pet.ageUnit}
            onChange={p('ageUnit')}
            className="w-28 shrink-0 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
          >
            <option value="months">Meses</option>
            <option value="years">Años</option>
          </select>
        </div>
        {errors.petAge && <span className="mt-1 block text-xs font-medium text-red-600">{errors.petAge}</span>}
      </div>

      <Field label="Comportamiento">
        <select className={inputClass} value={pet.temperament} onChange={p('temperament')}>
          <option value="">Sin indicar</option>
          {TEMPERAMENT.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
        <input
          type="checkbox"
          checked={pet.vaccinated}
          onChange={(e) => setPet((v) => ({ ...v, vaccinated: e.target.checked }))}
          className="h-4 w-4 accent-[#EC7B2D]"
        />
        Vacunas al día
      </label>
      <Field label="Alergias, condiciones de piel o salud" className="sm:col-span-2">
        <textarea className={inputClass} rows={2} value={pet.health} onChange={p('health')} />
      </Field>
    </div>
  )
}

function OwnerSearch({ onPick, error }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    searchOwners(q).then((data) => !cancelled && setResults(data))
    return () => {
      cancelled = true
    }
  }, [q])

  return (
    <div>
      <label className="relative block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input
          className={`${inputClass} !mt-0 pl-9`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca por nombre, identidad, teléfono o mascota"
          aria-label="Buscar cliente"
        />
      </label>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

      {q.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 rounded-lg bg-surface p-3 text-sm text-muted">
          No encontramos clientes con esa búsqueda. Si es su primera vez, elige «Primera vez».
        </p>
      )}
      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-black/5 rounded-lg ring-1 ring-black/10">
          {results.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onPick(o)}
                className="w-full px-4 py-3 text-left hover:bg-navy-100"
              >
                <span className="block font-semibold text-navy-700">{o.name}</span>
                <span className="block text-xs text-muted">
                  ID {o.dni} · {o.pets.map((p) => p.name).join(', ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function StepDatos({
  clientMode, setClientMode,
  owner, setOwner, pet, setPet, notes, setNotes,
  selectedOwner, setSelectedOwner, selectedPetId, setSelectedPetId,
  errors,
}) {
  const o = (key) => (e) => setOwner((v) => ({ ...v, [key]: e.target.value }))

  const ModeButton = ({ value, children }) => (
    <button
      type="button"
      onClick={() => setClientMode(value)}
      aria-pressed={clientMode === value}
      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
        clientMode === value ? 'bg-navy-700 text-white' : 'bg-white text-navy-700 ring-1 ring-black/10 hover:bg-navy-100'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-extrabold text-navy-700">¿El cliente ya está registrado?</h2>
        <div className="mt-3 flex gap-2">
          <ModeButton value="new">Primera vez</ModeButton>
          <ModeButton value="existing">Cliente registrado</ModeButton>
        </div>
        <p className="mt-2 text-sm text-muted">
          {clientMode === 'new'
            ? 'Se creará el expediente del cliente y de su mascota.'
            : 'Busca al cliente y elige a su mascota para usar su expediente.'}
        </p>
      </section>

      {clientMode === 'new' ? (
        <>
          <section>
            <h2 className="text-lg font-extrabold text-navy-700">Datos del dueño</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" required error={errors.ownerName} className="sm:col-span-2">
                <input className={inputClass} value={owner.name} onChange={o('name')} autoComplete="name" />
              </Field>
              <Field label="Número de identidad" required error={errors.ownerDni} hint="Con esto se identifica al cliente en todos sus expedientes.">
                <input className={inputClass} value={owner.dni} onChange={o('dni')} />
              </Field>
              <Field label="Teléfono o WhatsApp" required error={errors.ownerPhone}>
                <input className={inputClass} value={owner.phone} onChange={o('phone')} inputMode="tel" placeholder="9999-9999" />
              </Field>
              <Field label="Correo electrónico" error={errors.ownerEmail} hint="Opcional">
                <input className={inputClass} type="email" value={owner.email} onChange={o('email')} autoComplete="email" />
              </Field>
              <Field label="Dirección" hint="Opcional">
                <input className={inputClass} value={owner.address} onChange={o('address')} />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-navy-700">Datos de la mascota</h2>
            <PetForm pet={pet} setPet={setPet} errors={errors} />
          </section>
        </>
      ) : (
        <section>
          {!selectedOwner ? (
            <OwnerSearch
              error={errors.owner}
              onPick={(o) => {
                setSelectedOwner(o)
                setSelectedPetId(o.pets.length === 1 ? o.pets[0].id : '')
              }}
            />
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface p-4">
                <div>
                  <p className="font-bold text-navy-700">{selectedOwner.name}</p>
                  <p className="text-sm text-muted">ID {selectedOwner.dni} · {selectedOwner.phone}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedOwner(null)
                    setSelectedPetId('')
                  }}
                >
                  Cambiar cliente
                </Button>
              </div>

              <h2 className="mb-3 mt-6 text-lg font-extrabold text-navy-700">¿Para qué mascota es la cita?</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedOwner.pets.map((p) => {
                  const active = selectedPetId === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPetId(p.id)}
                      aria-pressed={active}
                      className={`rounded-xl p-4 text-left ring-1 transition-colors ${
                        active ? 'bg-navy-700 text-white ring-navy-700' : 'bg-white ring-black/10 hover:bg-navy-100'
                      }`}
                    >
                      <span className="block font-semibold">{p.name}</span>
                      <span className={`block text-xs ${active ? 'text-white/70' : 'text-muted'}`}>
                        {[p.species, p.breed, formatAgeMonths(currentAgeMonths(p))].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setSelectedPetId('new')}
                  aria-pressed={selectedPetId === 'new'}
                  className={`rounded-xl border-2 border-dashed p-4 text-left font-semibold transition-colors ${
                    selectedPetId === 'new'
                      ? 'border-brand-orange bg-brand-orange-soft text-brand-orange-dark'
                      : 'border-navy-100 text-navy-700 hover:bg-navy-100'
                  }`}
                >
                  Registrar otra mascota
                </button>
              </div>
              {errors.pet && <p className="mt-3 text-sm font-medium text-red-600">{errors.pet}</p>}
              {selectedPetId === 'new' && <PetForm pet={pet} setPet={setPet} errors={errors} />}
            </div>
          )}
        </section>
      )}

      {(clientMode === 'new' || selectedOwner) && (
        <Field label="Indicaciones para la cita" hint="Opcional. Estilo de corte, tono de color, cuidados especiales…">
          <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      )}
    </div>
  )
}