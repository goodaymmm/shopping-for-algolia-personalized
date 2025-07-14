import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DiscoveryPercentage } from '../types'

interface SettingsState {
  discoveryPercentage: DiscoveryPercentage
  isFirstTime: boolean
  
  // Actions
  setDiscoveryPercentage: (percentage: DiscoveryPercentage) => void
  setFirstTimeComplete: () => void
  syncWithElectron: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      discoveryPercentage: 0,
      isFirstTime: true,

      setDiscoveryPercentage: async (percentage) => {
        set({ discoveryPercentage: percentage })
        
        // Sync with Electron main process
        if (window.electronAPI) {
          try {
            await window.electronAPI.saveDiscoverySetting(percentage)
          } catch (error) {
            console.error('Failed to sync discovery setting with Electron:', error)
          }
        }
      },

      setFirstTimeComplete: () => {
        set({ isFirstTime: false })
      },

      syncWithElectron: async () => {
        if (window.electronAPI) {
          try {
            const percentage = await window.electronAPI.getDiscoverySetting()
            set({ discoveryPercentage: percentage })
          } catch (error) {
            console.error('Failed to sync settings from Electron:', error)
          }
        }
      }
    }),
    {
      name: 'shopping-settings',
      partialize: (state) => ({
        discoveryPercentage: state.discoveryPercentage,
        isFirstTime: state.isFirstTime
      })
    }
  )
)