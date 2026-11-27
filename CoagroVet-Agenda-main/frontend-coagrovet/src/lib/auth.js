// ============================================================
// AUTENTICACIÓN Y CUENTAS
// El servidor valida las contraseñas y el rol en cada petición.
// ============================================================

import { readSession, request, writeSession } from './http.js'

export function getSession() {
  return readSession()?.user ?? null
}

export async function login(username, password, role) {
  const { token, user } = await request('/auth/login', {
    method: 'POST',
    body: { username, password, role },
  })
  writeSession({ token, user })
  return user
}

export function logout() {
  // La petición toma el token antes de borrar la sesión; si falla, el token vence solo
  if (readSession()) request('/auth/logout', { method: 'POST' }).catch(() => {})
  writeSession(null)
}

export const getMyProfile = () => request('/me')

// ---------------------------------------------------------- CUENTAS DE EMPLEADOS (administrador)

export const getEmployees = () => request('/admin/employees')

// data: { name, username, dni, phone, email, password }
export const createEmployee = (data) =>
  request('/admin/employees', { method: 'POST', body: data })

// Si password viene vacía, se conserva la actual.
export const updateEmployee = (id, data) =>
  request(`/admin/employees/${encodeURIComponent(id)}`, { method: 'PUT', body: data })

export const deleteEmployee = (id) =>
  request(`/admin/employees/${encodeURIComponent(id)}`, { method: 'DELETE' })
