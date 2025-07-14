import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppSettings } from '../types/ui'

interface SettingsState extends AppSettings {
  updateSettings: (updates: Partial<AppSettings>) => void
}

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      fontSize: 'medium',
      sendOnEnter: true,
      showTimestamps: true,
      autoSave: true,
      discoveryMode: false,
      updateSettings: (updates) => set((state) => ({ ...state, ...updates })),
    }),
    {
      name: 'app-settings',
    }
  )
)

export const useSettings = () => {
  const state = useSettingsStore()
  const { updateSettings, ...settings } = state
  
  return {
    settings: settings as AppSettings,
    updateSettings
  }
}