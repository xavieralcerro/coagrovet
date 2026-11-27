// Comunicación con la API (Odoo). La URL se puede cambiar en el archivo .env:
//   VITE_API_URL=http://localhost:8069/api
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8069/api').replace(/\/+$/, '')
const SESSION_KEY = 'coagrovet:session'

// Se emite cuando el servidor ya no acepta la sesión (vencida o cuenta quitada)
export const SESSION_EXPIRED = 'coagrovet:session-expired'

// La sesión se guarda por pestaña: así puedes probar con dos usuarios en dos pestañas.
export function readSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    return s?.token && s?.user ? s : null
  } catch {
    return null
  }
}

export function writeSession(session) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else sessionStorage.removeItem(SESSION_KEY)
}

export async function request(path, { method = 'GET', body } = {}) {
  const token = readSession()?.token
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await res.json().catch(() => undefined)
  if (!res.ok) {
    // Solo cierra la sesión si el token rechazado sigue siendo el actual
    if (res.status === 401 && token && readSession()?.token === token) {
      writeSession(null)
      window.dispatchEvent(new Event(SESSION_EXPIRED))
    }
    throw new Error(data?.error || 'El servidor no pudo completar la operación')
  }
  if (data === undefined) throw new Error('Respuesta no válida del servidor')
  return data
}

// Arma "?a=1&b=2" codificando los valores
export const query = (params) => `?${new URLSearchParams(params)}`
