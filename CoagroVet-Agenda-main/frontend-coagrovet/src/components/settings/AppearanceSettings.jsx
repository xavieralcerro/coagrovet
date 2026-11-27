import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'

const OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Automático', icon: Monitor, hint: 'Sigue la configuración de tu dispositivo' },
]

export default function AppearanceSettings() {
  const { mode, setMode } = useTheme()

  return (
    <section className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <h2 className="text-lg font-extrabold text-navy-700">Apariencia</h2>
      <p className="text-sm text-muted">Elige cómo quieres ver el sistema. Se recuerda en este navegador.</p>

      <div role="radiogroup" aria-label="Tema del sistema" className="mt-4 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, icon: Icon, hint }) => {
          const active = mode === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(value)}
              className={`flex items-center gap-3 rounded-xl p-4 text-left ring-1 transition-colors ${
                active ? 'bg-navy-700 text-white ring-navy-700' : 'bg-white ring-black/10 hover:bg-navy-100'
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  active ? 'bg-brand-orange text-white' : 'bg-surface text-navy-700'
                }`}
              >
                <Icon size={20} aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{label}</span>
                {hint && <span className={`block text-xs ${active ? 'text-white/70' : 'text-muted'}`}>{hint}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}