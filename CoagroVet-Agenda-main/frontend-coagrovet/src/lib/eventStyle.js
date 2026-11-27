import { CalendarPlus, CalendarX, CheckCircle2 } from 'lucide-react'

export const EVENT_STYLE = {
  agendada: { icon: CalendarPlus, color: 'text-navy-700', bg: 'bg-navy-100', bar: 'border-navy-600' },
  completada: { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', bar: 'border-emerald-500' },
  cancelada: { icon: CalendarX, color: 'text-red-700', bg: 'bg-red-100', bar: 'border-red-500' },
}