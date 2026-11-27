// ============================================================
// AVISOS
// El servidor crea un aviso cuando alguien agenda, completa o cancela una cita.
// Aquí se consultan cada pocos segundos mientras la app está abierta.
// ============================================================

import { formatShortDate, formatTime } from './dates.js'
import { readSession, request } from './http.js'

const EVERY_MS = 15000
const newListeners = new Set() // reciben cada aviso nuevo
const changeListeners = new Set() // se enteran de que cambió la lista o lo leído

let items = [] // más recientes primero
let lastRead = ''
let owner = null // token al que pertenecen los datos guardados
let loaded = false
let timer = null
let polling = false

function syncOwner() {
  const token = readSession()?.token ?? null
  if (token === owner) return
  owner = token
  items = []
  lastRead = ''
  loaded = false
}

async function poll() {
  syncOwner()
  if (!owner || polling) return
  polling = true
  const token = owner
  try {
    const data = await request('/notifications')
    if (readSession()?.token !== token) return // cambió la sesión mientras tanto
    const known = new Set(items.map((e) => e.id))
    const fresh = loaded ? data.items.filter((e) => !known.has(e.id)) : []
    const changed = !loaded || fresh.length > 0 || data.lastRead > lastRead
    items = data.items
    if (data.lastRead > lastRead) lastRead = data.lastRead
    loaded = true
    if (changed) changeListeners.forEach((fn) => fn())
    fresh.reverse().forEach((event) => newListeners.forEach((fn) => fn(event)))
  } catch {
    // Sin conexión: se vuelve a intentar en la siguiente consulta
  } finally {
    polling = false
  }
}

function listen(set, fn) {
  set.add(fn)
  if (!timer) {
    timer = setInterval(poll, EVERY_MS)
    setTimeout(poll, 0)
  }
  return () => {
    set.delete(fn)
    if (!newListeners.size && !changeListeners.size) {
      clearInterval(timer)
      timer = null
    }
  }
}

// Recibe cada aviso nuevo. Devuelve la función para cancelar la suscripción.
export const subscribe = (fn) => listen(newListeners, fn)

// Avisa cuando hay datos distintos que mostrar
export const onChange = (fn) => listen(changeListeners, fn)

export function listEvents() {
  syncOwner()
  return items
}

export function getLastRead() {
  syncOwner()
  return lastRead
}

export function markRead() {
  const now = `${new Date().toISOString().slice(0, 19)}Z`
  // Incluye el aviso más reciente aunque el reloj de esta computadora esté atrasado
  lastRead = items[0]?.at > now ? items[0].at : now
  request('/notifications/read', { method: 'POST' }).catch(() => {})
  return lastRead
}

const VERBS = {
  agendada: 'agendó una cita para',
  completada: 'completó la cita de',
  cancelada: 'canceló la cita de',
}

export function describeEvent(event) {
  return {
    title: `${event.by.name} ${VERBS[event.type]} ${event.patient}`,
    detail: `${formatShortDate(event.date)} · ${formatTime(event.time)} · Dueño: ${event.client}`,
  }
}
