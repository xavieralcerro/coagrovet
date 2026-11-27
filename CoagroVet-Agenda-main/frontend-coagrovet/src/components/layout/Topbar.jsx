import { Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from './NotificationBell.jsx'

export default function Topbar({ onMenu }) {
  const { user } = useAuth()
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/5 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-navy-700 hover:bg-surface lg:hidden" aria-label="Abrir menú">
        <Menu size={22} />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-700 text-sm font-bold text-white">{initials}</span>
          <span className="hidden text-sm font-semibold text-navy-700 md:block">{user.name}</span>
        </div>
      </div>
    </header>
  )
}