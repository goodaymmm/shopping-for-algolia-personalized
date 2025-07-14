import { useEffect, useCallback } from 'react'
import { useSettingsStore } from '../store'
import { DiscoveryPercentage } from '../types'

export const useDiscoverySettings = () => {
  const {
    discoveryPercentage,
    isFirstTime,
    setDiscoveryPercentage,
    setFirstTimeComplete,
    syncWithElectron
  } = useSettingsStore()

  // Sync with Electron on mount
  useEffect(() => {
    syncWithElectron()
  }, [syncWithElectron])

  const updateDiscoveryPercentage = useCallback(async (percentage: DiscoveryPercentage) => {
    await setDiscoveryPercentage(percentage)
    
    // Mark first time as complete
    if (isFirstTime) {
      setFirstTimeComplete()
    }
  }, [setDiscoveryPercentage, isFirstTime, setFirstTimeComplete])

  const getDiscoveryDescription = useCallback((percentage: DiscoveryPercentage) => {
    switch (percentage) {
      case 0:
        return 'Show only personalized results based on your preferences'
      case 5:
        return 'Mix in 5% diverse products for inspiration and discovery'
      case 10:
        return 'Mix in 10% diverse products for more variety and exploration'
      default:
        return 'Unknown setting'
    }
  }, [])

  const showFirstTimeExplanation = useCallback(() => {
    return isFirstTime && discoveryPercentage === 0
  }, [isFirstTime, discoveryPercentage])

  return {
    // State
    discoveryPercentage,
    isFirstTime,
    
    // Actions
    updateDiscoveryPercentage,
    
    // Utilities
    getDiscoveryDescription,
    showFirstTimeExplanation,
    
    // Settings info
    isDiscoveryEnabled: discoveryPercentage > 0,
    discoveryLevel: discoveryPercentage === 5 ? 'low' : discoveryPercentage === 10 ? 'high' : 'off'
  }
}