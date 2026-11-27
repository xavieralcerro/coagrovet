import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import Agenda from './pages/Agenda.jsx'
import Agendar from './pages/Agendar.jsx'
import Clientes from './pages/Clientes.jsx'
import Servicios from './pages/Servicios.jsx'
import Informes from './pages/Informes.jsx'
import Ajustes from './pages/Ajustes.jsx'
import Login from './pages/Login.jsx'
import Placeholder from './pages/Placeholder.jsx'
import { NAV } from './lib/nav.js'
import { useAuth } from './context/AuthContext.jsx'

// Módulos que ya tienen pantalla propia
const READY = {
  '/agenda': Agenda,
  '/agendar': Agendar,
  '/clientes': Clientes,
  '/servicios': Servicios,
  '/informes': Informes,
  '/ajustes': Ajustes,
}

// Solo deja pasar a usuarios con sesión iniciada
function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Navigate to="/agenda" replace />} />
        {NAV.map((n) => {
          const Page = READY[n.to]
          const allowed = !n.roles || n.roles.includes(user?.role)
          return (
            <Route
              key={n.to}
              path={n.to}
              element={allowed ? (Page ? <Page /> : <Placeholder title={n.label} />) : <Navigate to="/agenda" replace />}
            />
          )
        })}
      </Route>
      <Route path="*" element={<Navigate to="/agenda" replace />} />
    </Routes>
  )
}