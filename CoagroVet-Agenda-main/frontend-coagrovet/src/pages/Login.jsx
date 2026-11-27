import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Button from '../components/Button.jsx'
import { inputClass } from '../components/agendar/Field.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import Credits from '../components/layout/Credits.jsx'

export default function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('employee')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(username, password, role)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const RoleButton = ({ value, children }) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      aria-pressed={role === value}
      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
        role === value ? 'bg-navy-700 text-white' : 'bg-white text-navy-700 ring-1 ring-black/10 hover:bg-navy-100'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="grid min-h-full place-items-center bg-navy-700 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl">
        <img src="/LogoCoagroVet.png" alt="Coagro Vet" className="mx-auto h-16 w-auto" />
        <h1 className="mt-4 text-center text-xl font-extrabold text-navy-700">Iniciar sesión</h1>
        <p className="mb-5 text-center text-sm text-muted">Sistema de citas Coagro Vet</p>

        <div className="mb-4 flex gap-2">
          <RoleButton value="employee">Empleado</RoleButton>
          <RoleButton value="admin">Administrador</RoleButton>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-navy-700">Usuario</span>
          <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </label>
        <div className="mt-4">
          <label htmlFor="login-password" className="text-sm font-semibold text-navy-700">Contraseña</label>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}.</p>}

        <Button type="submit" disabled={loading} className="mt-5 w-full">
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
        
        <Credits className="mt-6 text-center" />
      </form>
    </div>
  )
}