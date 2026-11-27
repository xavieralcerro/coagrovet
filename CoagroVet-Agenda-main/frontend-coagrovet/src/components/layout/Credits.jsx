import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { CREDITS } from '../../lib/credits.js'
import Button from '../Button.jsx'

// "Ana, Luis y Marta"
const names = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(
  CREDITS.team.map((p) => p.name)
)

function CreditsDialog({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-xl"
      >
        <h2 id="credits-title" className="text-lg font-extrabold text-navy-700">Equipo de desarrollo</h2>
        <p className="mt-1 text-sm text-muted">¿Dudas o sugerencias sobre el sistema? Escríbenos.</p>

        <ul className="mt-4 divide-y divide-black/5">
          {CREDITS.team.map((p) => (
            <li key={p.email} className="py-3">
              <p className="text-sm font-semibold text-navy-700">{p.name}</p>
              {p.role && <p className="text-xs text-muted">{p.role}</p>}
              <a
                href={`mailto:${p.email}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-brand-orange-dark hover:underline"
              >
                <Mail size={14} aria-hidden /> {p.email}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <Button variant="ghost" onClick={onClose} autoFocus>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}

export default function Credits({ className = '' }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <p className={`text-xs text-muted ${className}`}>
        © {CREDITS.year} Coagro Vet · Desarrollado por {names} ·{' '}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="underline decoration-black/20 underline-offset-2 hover:text-navy-700"
        >
          Contacto
        </button>
      </p>
      {open && <CreditsDialog onClose={() => setOpen(false)} />}
    </>
  )
}