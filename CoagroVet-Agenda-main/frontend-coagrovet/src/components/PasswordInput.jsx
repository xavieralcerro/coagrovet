import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { inputClass } from './agendar/Field.jsx'

// Campo de contraseña con botón para mostrar u ocultar lo que se escribe
export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass} pr-11 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 mt-1 grid w-11 place-items-center rounded-r-lg text-muted transition-colors hover:text-navy-700"
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  )
}