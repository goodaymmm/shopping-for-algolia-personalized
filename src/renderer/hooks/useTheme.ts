import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  changeTheme: (theme: Theme) => void
}

const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (theme: Theme) => {
  const root = document.documentElement
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme
  
  if (effectiveTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  
  return effectiveTheme === 'dark'
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      isDark: applyTheme('system'),
      setTheme: (theme) => {
        const isDark = applyTheme(theme)
        set({ theme, isDark })
      },
      changeTheme: (theme) => {
        const isDark = applyTheme(theme)
        set({ theme, isDark })
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isDark = applyTheme(state.theme)
          state.isDark = isDark
        }
      },
    }
  )
)

// Listen for system theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = useTheme.getState().theme
    if (currentTheme === 'system') {
      const isDark = applyTheme('system')
      useTheme.setState({ isDark })
    }
  })
}

// Initialize theme on load
const savedTheme = useTheme.getState().theme
const initialIsDark = applyTheme(savedTheme)
useTheme.setState({ isDark: initialIsDark })