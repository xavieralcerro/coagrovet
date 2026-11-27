export const STATUS = {
  agendada: { label: 'Agendada', style: 'bg-navy-100 text-navy-700' },
  completada: { label: 'Completada', style: 'bg-emerald-100 text-emerald-800' },
  cancelada: { label: 'Cancelada', style: 'bg-red-100 text-red-700' },
}

export default function StatusBadge({ status }) {
  const { label, style } = STATUS[status] ?? STATUS.agendada
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}