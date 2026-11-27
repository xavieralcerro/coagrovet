// Fecha local en formato YYYY-MM-DD (evita el desfase de toISOString por zona horaria)
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, amount) {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + amount)
  return toISODate(date)
}

export function isToday(iso) {
  return iso === toISODate(new Date())
}

export function formatLongDate(iso) {
  const text = fromISODate(iso).toLocaleDateString('es-HN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "14:30" -> "2:30 PM"
export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate() // month: 0 = enero
}

// Cuadrícula del mes con semana de lunes a domingo.
// Los espacios vacíos al inicio y al final son null.
export function monthMatrix(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const total = Math.ceil((offset + daysInMonth(year, month)) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const day = i - offset + 1
    return day >= 1 && day <= daysInMonth(year, month)
      ? toISODate(new Date(year, month, day))
      : null
  })
}

export function formatMonthYear(year, month) {
  const text = new Date(year, month, 1).toLocaleDateString('es-HN', {
    month: 'long',
    year: 'numeric',
  })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// 150 -> "2 h 30 min"
export function formatDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

// (3, 'years') -> "3 años" | (1, 'months') -> "1 mes"
export function formatAge(value, unit) {
  if (!value) return ''
  const n = Number(value)
  const word = unit === 'months' ? (n === 1 ? 'mes' : 'meses') : n === 1 ? 'año' : 'años'
  return `${n} ${word}`
}

export function formatShortDate(iso) {
  return fromISODate(iso).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// La edad se guarda en meses el día del registro; aquí se calcula la edad actual.
export function currentAgeMonths(pet) {
  if (pet.ageInMonths == null) return null
  const rec = fromISODate(pet.ageRecordedAt || toISODate(new Date()))
  const now = new Date()
  const diff = (now.getFullYear() - rec.getFullYear()) * 12 + (now.getMonth() - rec.getMonth())
  return pet.ageInMonths + Math.max(0, diff)
}

export function formatAgeMonths(total) {
  if (total == null) return ''
  if (total < 12) return `${total} ${total === 1 ? 'mes' : 'meses'}`
  const y = Math.floor(total / 12)
  const m = total % 12
  const years = `${y} ${y === 1 ? 'año' : 'años'}`
  return m ? `${years} ${m} ${m === 1 ? 'mes' : 'meses'}` : years
}

// "2 nov, 3:45 PM" a partir de una fecha ISO completa
export function formatStamp(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })
  const time = formatTime(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`)
  return `${date}, ${time}`
}