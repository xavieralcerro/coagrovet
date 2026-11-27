// ============================================================
// CAPA DE DATOS DE COAGRO VET
// Cada función llama a la API (Odoo). Las reglas y validaciones están en el servidor.
// ============================================================

import { query, request } from './http.js'

const id = encodeURIComponent

// ---------------------------------------------------------- AGENDA

// Citas de un día. date = 'YYYY-MM-DD'
export const getAppointmentsByDate = (date) => request(`/appointments${query({ date })}`)

// Citas de un mes agrupadas por día. month = 'YYYY-MM'
export async function getAppointmentsByMonth(month) {
  const list = await request(`/appointments${query({ month })}`)
  return list.reduce((acc, a) => {
    ;(acc[a.date] ||= []).push(a)
    return acc
  }, {})
}

// status: completada | cancelada
export const updateAppointmentStatus = (appointmentId, status) =>
  request(`/appointments/${id(appointmentId)}`, { method: 'PATCH', body: { status } })

// ---------------------------------------------------------- AGENDAR CITA

export const getAvailableSlots = (date, duration) =>
  request(`/availability${query({ date, duration })}`)

// Devuelve el cliente o null. Si falla la consulta, el servidor igual rechaza duplicados al guardar.
export async function findOwnerByDni(dni) {
  try {
    return await request(`/owners${query({ dni })}`)
  } catch {
    return null
  }
}

export const createAppointment = (payload) =>
  request('/appointments', { method: 'POST', body: payload })

// ---------------------------------------------------------- CLIENTES Y EXPEDIENTES

export const searchOwners = (search = '') => request(`/owners${query({ search })}`)

export const getPetRecord = (petId) => request(`/pets/${id(petId)}/record`)

// ---------------------------------------------------------- ELIMINAR (administrador)

const path = (type) => (type === 'owner' ? 'owners' : 'pets')

export const getDeletionImpact = (type, recordId) =>
  request(`/${path(type)}/${id(recordId)}/deletion-impact`)

export const deleteOwner = (ownerId, password) =>
  request(`/owners/${id(ownerId)}`, { method: 'DELETE', body: { password } })

export const deletePet = (petId, password) =>
  request(`/pets/${id(petId)}`, { method: 'DELETE', body: { password } })

// ---------------------------------------------------------- CATÁLOGO DE SERVICIOS

export const getServices = ({ includeInactive = false } = {}) =>
  request(`/services${includeInactive ? '?includeInactive=1' : ''}`)

export const createService = (data) => request('/services', { method: 'POST', body: data })

export const updateService = (serviceId, data) =>
  request(`/services/${id(serviceId)}`, { method: 'PUT', body: data })

export const setServiceActive = (serviceId, active) =>
  request(`/services/${id(serviceId)}`, { method: 'PATCH', body: { active } })

export const deleteService = (serviceId) =>
  request(`/services/${id(serviceId)}`, { method: 'DELETE' })

// ---------------------------------------------------------- INFORMES (administrador)

export const getReport = (from, to) => request(`/admin/reports${query({ from, to })}`)

export const getAccessLog = (from, to) => request(`/admin/logins${query({ from, to })}`)
