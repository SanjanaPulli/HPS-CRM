import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('hps-theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    localStorage.setItem('hps-theme', theme)
    if (theme === 'dark') {
      root.classList.add('dark')
      // Background & surfaces
      root.style.setProperty('--bg', '#0D1117')
      root.style.setProperty('--surface', '#161B27')
      root.style.setProperty('--surface2', '#1C2333')
      root.style.setProperty('--border', 'rgba(255,255,255,0.07)')
      // Text
      root.style.setProperty('--text-primary', '#F1F5F9')
      root.style.setProperty('--text-secondary', '#94A3B8')
      root.style.setProperty('--text-muted', '#475569')
      // Topbar
      root.style.setProperty('--topbar-bg', '#161B27')
      root.style.setProperty('--topbar-border', 'rgba(255,255,255,0.07)')
      // Cards
      root.style.setProperty('--card-bg', '#161B27')
      root.style.setProperty('--card-border', 'rgba(255,255,255,0.07)')
      // Input
      root.style.setProperty('--input-bg', 'rgba(255,255,255,0.05)')
      root.style.setProperty('--input-border', 'rgba(255,255,255,0.08)')
    } else {
      root.classList.remove('dark')
      root.style.setProperty('--bg', '#F8FAFC')
      root.style.setProperty('--surface', '#FFFFFF')
      root.style.setProperty('--surface2', '#F1F5F9')
      root.style.setProperty('--border', '#E2E8F0')
      root.style.setProperty('--text-primary', '#1A1A2E')
      root.style.setProperty('--text-secondary', '#64748B')
      root.style.setProperty('--text-muted', '#94A3B8')
      root.style.setProperty('--topbar-bg', '#FFFFFF')
      root.style.setProperty('--topbar-border', '#E8EDF2')
      root.style.setProperty('--card-bg', '#FFFFFF')
      root.style.setProperty('--card-border', '#E2E8F0')
      root.style.setProperty('--input-bg', '#F8FAFC')
      root.style.setProperty('--input-border', '#E2E8F0')
    }
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)