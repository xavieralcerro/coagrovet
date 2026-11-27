import { Link } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Button from '../components/Button.jsx'

export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="Resumen del día"
        description="Aquí verás las citas de hoy y el estado de la agenda."
        action={<Link to="/agendar"><Button><CalendarPlus size={18} />Agendar cita</Button></Link>}
      />
      <section className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
        <p className="font-bold text-navy-700">Aún no hay citas registradas</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Agenda la primera cita para ver aquí el resumen de la jornada.</p>
      </section>
    </>
  )
}
