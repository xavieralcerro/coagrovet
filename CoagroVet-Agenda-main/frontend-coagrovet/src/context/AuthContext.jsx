import { createContext, useContext, useEffect, useState } from 'react'
import { getSession, login, logout } from '../lib/auth.js'
import { SESSION_EXPIRED } from '../lib/http.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession())

  // Si el servidor rechaza la sesión, vuelve a la pantalla de login
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(SESSION_EXPIRED, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired)
  }, [])

  async function signIn(username, password, role) {
    setUser(await login(username, password, role))
  }

  function signOut() {
    logout()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)