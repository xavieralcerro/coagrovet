import { useEffect, useState } from 'react'
import { ShieldCheck, TriangleAlert } from 'lucide-react'
import Button from './Button.jsx'
import PasswordInput from './PasswordInput.jsx'

// Pide la contraseña del administrador antes de una acción sensible.
// onSubmit(password) debe lanzar un error si la contraseña no es correcta.
export default function PasswordPrompt({
  open, title, message, confirmLabel = 'Confirmar', danger = false, onSubmit, onCancel,
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const Icon = danger ? TriangleAlert : ShieldCheck

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onSubmit(password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/60 p-4" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-4">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
              danger ? 'bg-brand-orange-soft text-brand-orange-dark' : 'bg-navy-100 text-navy-700'
            }`}
          >
            <Icon size={22} aria-hidden />
          </span>
          <div>
            <h2 id="prompt-title" className="text-lg font-extrabold text-navy-700">{title}</h2>
            <p className="mt-1 text-sm text-muted">{message}</p>
          </div>
        </div>

        <label htmlFor="admin-password" className="mt-5 block text-sm font-semibold text-navy-700">
          Tu contraseña de administrador
        </label>
        <PasswordInput
          id="admin-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
        {error && <p className="mt-2 text-sm font-medium text-red-600" role="alert">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Button>
          {danger ? (
            <button
              type="submit"
              disabled={loading || !password}
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Verificando…' : confirmLabel}
            </button>
          ) : (
            <Button type="submit" disabled={loading || !password}>
              {loading ? 'Verificando…' : confirmLabel}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}