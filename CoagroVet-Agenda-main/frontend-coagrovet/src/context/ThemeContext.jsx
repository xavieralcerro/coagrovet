import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'coagrovet:theme'
const ThemeContext = createContext(null)

function readStored() {
  try {
    const v = localStorage.getItem(KEY)
    return ['light', 'dark', 'system'].includes(v) ? v : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStored) // 'light' | 'dark' | 'system'
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  // En modo automático, sigue los cambios del dispositivo
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isDark = mode === 'dark' || (mode === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  function changeMode(next) {
    setMode(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* si el navegador no permite guardar, el cambio sigue valiendo en esta sesión */
    }
  }

  return <ThemeContext.Provider value={{ mode, isDark, setMode: changeMode }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)