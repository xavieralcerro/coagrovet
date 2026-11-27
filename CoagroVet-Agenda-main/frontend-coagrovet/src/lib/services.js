export const CATEGORY = 'COAGROPET-SPA'

// Toda cita reserva el mismo tiempo, sin importar los servicios elegidos.
// TODO API: este valor puede venir de la configuración de la clínica (GET /settings).
export const APPOINTMENT_DURATION = 150 // minutos (2 h 30 min)

// TODO API: confirmar con el propietario y traer de la configuración (GET /settings).
export const CLINIC_HOURS = 'Lunes a sábado, de 8:00 AM a 5:00 PM'