import { CalendarPlus, CalendarDays, Users, Stethoscope, Settings, BarChart3 } from 'lucide-react'

// roles: quién ve el módulo. Sin "roles" = todos.
export const NAV = [
  { to: '/agendar', label: 'Agendar cita', icon: CalendarPlus },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicios', label: 'Servicios', icon: Stethoscope },
  { to: '/informes', label: 'Informes', icon: BarChart3, roles: ['admin'] },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]