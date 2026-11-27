import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { NAV } from '../../lib/nav.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Sidebar({ open, onClose }) {
  const { user, signOut } = useAuth()
  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role))

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-900/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-700 text-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
          <img src="/LogoCoagroVet.png" alt="Coagro Vet" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="font-extrabold tracking-tight">Coagro Vet</p>
            <p className="text-xs text-white/60">Gestión de citas</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-orange text-white shadow-sm'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="mb-3 text-xs text-white/60">{user.role === 'admin' ? 'Administrador' : 'Empleado'}</p>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} aria-hidden /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}