import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { getLastRead, listEvents, markRead, onChange, subscribe } from '../lib/events.js'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const [events, setEvents] = useState(listEvents)
  const [lastRead, setLastRead] = useState(() => getLastRead(user.id))
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const refresh = () => {
      setEvents(listEvents())
      setLastRead(getLastRead(user.id))
    }
    refresh()
    const stopChanges = onChange(refresh)
    const stopNew = subscribe((event) => {
      if (event.by.id === user.id) return // no avisar de lo que hizo uno mismo
      setToasts((list) => [...list, event].slice(-3))
    })
    return () => {
      stopChanges()
      stopNew()
    }
  }, [user.id])

  // Historial: solo lo que hicieron otras personas
  const items = useMemo(() => events.filter((e) => e.by.id !== user.id), [events, user.id])
  const unread = items.filter((e) => e.at > lastRead).length

  const markAllRead = useCallback(() => setLastRead(markRead(user.id)), [user.id])
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  return (
    <NotificationsContext.Provider value={{ items, unread, lastRead, toasts, markAllRead, dismissToast }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsContext)