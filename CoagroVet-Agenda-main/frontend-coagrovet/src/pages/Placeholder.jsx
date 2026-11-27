import PageHeader from '../components/PageHeader.jsx'

export default function Placeholder({ title }) {
  return (
    <>
      <PageHeader title={title} description="Módulo pendiente de construir." />
      <div className="rounded-xl border-2 border-dashed border-navy-100 bg-white/60 p-12 text-center text-sm text-muted">
        Espacio de trabajo listo para {title.toLowerCase()}.
      </div>
    </>
  )
}
