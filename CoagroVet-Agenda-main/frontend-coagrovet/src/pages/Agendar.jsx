import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Button from '../components/Button.jsx'
import StepServicio from '../components/agendar/StepServicio.jsx'
import StepFecha from '../components/agendar/StepFecha.jsx'
import StepDatos from '../components/agendar/StepDatos.jsx'
import { createAppointment, findOwnerByDni, getServices  } from '../lib/api.js'
import { APPOINTMENT_DURATION, CATEGORY } from '../lib/services.js'
import {
  currentAgeMonths, formatAge, formatAgeMonths, formatDuration,
  formatLongDate, formatTime, toISODate,
} from '../lib/dates.js'

const STEPS = ['Servicio', 'Fecha y hora', 'Cliente y mascota', 'Confirmación']
const EMPTY_OWNER = { name: '', dni: '', phone: '', email: '', address: '' }
const EMPTY_PET = {
  name: '', species: 'Perro', breed: '', sex: '',
  ageValue: '', ageUnit: 'years', // ageUnit: 'months' | 'years'
  temperament: '', vaccinated: false, health: '',
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{children || '—'}</dd>
    </div>
  )
}

function checkPet(pet, e) {
  if (!pet.name.trim()) e.petName = 'Escribe el nombre de la mascota.'
  if (pet.ageValue !== '') {
    const n = Number(pet.ageValue)
    const max = pet.ageUnit === 'months' ? 120 : 40
    if (!Number.isInteger(n) || n < 1 || n > max) e.petAge = `Escribe un número entero entre 1 y ${max}.`
  }
}

export default function Agendar() {
  const [step, setStep] = useState(0)
  const [services, setServices] = useState([])
  const [date, setDate] = useState(toISODate(new Date()))
  const [time, setTime] = useState('')
  const [clientMode, setClientMode] = useState('new') // 'new' | 'existing'
  const [owner, setOwner] = useState(EMPTY_OWNER)
  const [pet, setPet] = useState(EMPTY_PET)
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [selectedPetId, setSelectedPetId] = useState('') // '' | id de mascota | 'new'
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [done, setDone] = useState(null)
  const [catalog, setCatalog] = useState(null) // servicios activos del catálogo

  useEffect(() => {
    getServices().then(setCatalog).catch(() => setCatalog([]))
  }, [])
  

  const duration = APPOINTMENT_DURATION
  const picked = (catalog ?? []).filter((s) => services.includes(s.id))
  const needsPetForm = clientMode === 'new' || selectedPetId === 'new'
  const existingPet = !needsPetForm ? selectedOwner?.pets.find((p) => p.id === selectedPetId) : null

  function toggleService(id) {
    setServices((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  }

  async function validate() {
    const e = {}
    if (step === 0 && services.length === 0) e.services = 'Elige al menos un servicio.'
    if (step === 1 && !time) e.time = 'Elige una hora para continuar.'
    if (step === 2) {
      if (clientMode === 'new') {
        if (!owner.name.trim()) e.ownerName = 'Escribe el nombre del dueño.'
        if (!owner.dni.trim()) e.ownerDni = 'El número de identidad es obligatorio.'
        if (owner.phone.replace(/\D/g, '').length < 8) e.ownerPhone = 'Escribe un teléfono de al menos 8 dígitos.'
        if (owner.email && !/^\S+@\S+\.\S+$/.test(owner.email)) e.ownerEmail = 'Revisa el formato del correo.'
        checkPet(pet, e)
        if (!e.ownerDni) {
          const found = await findOwnerByDni(owner.dni)
          if (found) {
            e.ownerDni = `Esta identidad ya está registrada a nombre de ${found.name}. Elige «Cliente registrado».`
          }
        }
      } else if (!selectedOwner) {
        e.owner = 'Busca y elige al cliente.'
      } else if (!selectedPetId) {
        e.pet = 'Elige una mascota o registra una nueva.'
      } else if (selectedPetId === 'new') {
        checkPet(pet, e)
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function next() {
    if (await validate()) setStep((s) => s + 1)
  }
  const back = () => {
    setErrors({})
    setStep((s) => s - 1)
  }

  async function confirm() {
    setSaving(true)
    setSubmitError(null)
    try {
      // La edad se guarda como número, unidad y total en meses (fácil de ordenar y filtrar).
      let petData = null
      if (needsPetForm) {
        const hasAge = pet.ageValue !== ''
        const ageValue = hasAge ? Number(pet.ageValue) : null
        const ageInMonths = hasAge ? (pet.ageUnit === 'years' ? ageValue * 12 : ageValue) : null
        petData = { ...pet, ageValue, ageInMonths }
      }

      const created = await createAppointment({
        category: CATEGORY,
        date,
        time,
        duration,
        services: picked.map(({ id, name }) => ({ id, name })),
        notes,
        ownerId: clientMode === 'existing' ? selectedOwner.id : null,
        owner: clientMode === 'new' ? owner : null,
        petId: needsPetForm ? null : selectedPetId,
        pet: petData,
      })
      setDone(created)
    } catch (e) {
      setSubmitError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setStep(0)
    setServices([])
    setTime('')
    setClientMode('new')
    setOwner(EMPTY_OWNER)
    setPet(EMPTY_PET)
    setSelectedOwner(null)
    setSelectedPetId('')
    setNotes('')
    setDone(null)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500" aria-hidden />
        <h1 className="mt-3 text-2xl font-extrabold text-navy-700">Cita agendada</h1>
        <p className="mt-2 text-sm text-muted">
          {done.patient} tiene cita el {formatLongDate(done.date).toLowerCase()} a las {formatTime(done.time)}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/agenda"><Button>Ver en la agenda</Button></Link>
          <Button variant="ghost" onClick={reset}>Agendar otra cita</Button>
        </div>
      </div>
    )
  }

  const ownerInfo = clientMode === 'new' ? owner : selectedOwner
  const petName = needsPetForm ? pet.name : existingPet?.name
  const petLine = needsPetForm
    ? [pet.name, pet.species, pet.breed]
    : [existingPet?.name, existingPet?.species, existingPet?.breed]
  const petDetails = needsPetForm
    ? [pet.sex, formatAge(pet.ageValue, pet.ageUnit), pet.temperament]
    : [existingPet?.sex, formatAgeMonths(currentAgeMonths(existingPet ?? {})), existingPet?.temperament]
  const recordNote =
    clientMode === 'new'
      ? 'Se creará un expediente nuevo para este cliente y su mascota.'
      : needsPetForm
        ? `Se registrará una mascota nueva a nombre de ${selectedOwner?.name}.`
        : `Se agregará al expediente de ${petName}.`

  return (
    <>
      <PageHeader title="Agendar cita" description={`Servicios ${CATEGORY}`} />

      <ol className="mb-6 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Progreso">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-orange text-white' : 'bg-white text-muted ring-1 ring-black/10'
              }`}
            >
              {i < step ? <Check size={14} aria-hidden /> : i + 1}
            </span>
            <span className={`whitespace-nowrap text-sm font-semibold ${i === step ? 'text-navy-700' : 'text-muted'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-black/15" />}
          </li>
        ))}
      </ol>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
        {step === 0 && <StepServicio catalog={catalog} selected={services} onToggle={toggleService} error={errors.services} />}
        {step === 1 && (
          <StepFecha
            date={date}
            time={time}
            duration={duration}
            onDate={(d) => { setDate(d); setTime('') }}
            onTime={setTime}
            error={errors.time}
          />
        )}
        {step === 2 && (
          <StepDatos
            clientMode={clientMode} setClientMode={setClientMode}
            owner={owner} setOwner={setOwner} pet={pet} setPet={setPet}
            notes={notes} setNotes={setNotes}
            selectedOwner={selectedOwner} setSelectedOwner={setSelectedOwner}
            selectedPetId={selectedPetId} setSelectedPetId={setSelectedPetId}
            errors={errors}
          />
        )}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-extrabold text-navy-700">Revisa y confirma</h2>
            <dl className="mt-3 divide-y divide-black/5">
              <Row label="Servicios">{picked.map((s) => s.name).join(', ')}</Row>
              <Row label="Fecha y hora">{`${formatLongDate(date)}, ${formatTime(time)}`}</Row>
              <Row label="Tiempo reservado">{formatDuration(duration)}</Row>
              <Row label="Dueño">{ownerInfo?.name}</Row>
              <Row label="Identidad">{ownerInfo?.dni}</Row>
              <Row label="Contacto">{[ownerInfo?.phone, ownerInfo?.email].filter(Boolean).join(' · ')}</Row>
              <Row label="Mascota">{petLine.filter(Boolean).join(' · ')}</Row>
              <Row label="Detalles">{petDetails.filter(Boolean).join(' · ')}</Row>
              <Row label="Indicaciones">{notes}</Row>
              <Row label="Expediente">{recordNote}</Row>
            </dl>
            {submitError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {submitError}. Revisa los datos e intenta de nuevo.
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-black/5 pt-5">
          <Button variant="ghost" onClick={back} disabled={step === 0 || saving} className={step === 0 ? 'invisible' : ''}>
            Atrás
          </Button>
          {step < 3 ? (
            <Button onClick={next}>Continuar</Button>
          ) : (
            <Button onClick={confirm} disabled={saving}>
              {saving ? 'Guardando…' : 'Confirmar cita'}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}