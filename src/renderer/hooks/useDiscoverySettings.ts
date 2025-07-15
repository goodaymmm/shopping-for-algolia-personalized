import { useState, useEffect, useCallback } from 'react';
import { DiscoveryPercentage } from '../types';

interface DiscoveryState {
  outlierPercentage: DiscoveryPercentage;
  isLoading: boolean;
  error: string | null;
  isFirstTime: boolean;
}

export const useDiscoverySettings = () => {
  const [state, setState] = useState<DiscoveryState>({
    outlierPercentage: 0,
    isLoading: false,
    error: null,
    isFirstTime: false
  });

  // Load discovery settings
  const loadSettings = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (window.electronAPI && window.electronAPI.getDiscoverySetting) {
        // Load from Electron database
        const percentage = await window.electronAPI.getDiscoverySetting();
        setState(prev => ({
          ...prev,
          outlierPercentage: percentage,
          isLoading: false,
          isFirstTime: false
        }));
      } else {
        // Load from localStorage in development
        const saved = localStorage.getItem('discoverySettings');
        
        if (saved) {
          const settings = JSON.parse(saved);
          setState(prev => ({
            ...prev,
            outlierPercentage: settings.outlierPercentage || 0,
            isLoading: false,
            isFirstTime: false
          }));
        } else {
          // First time user
          setState(prev => ({
            ...prev,
            outlierPercentage: 0,
            isLoading: false,
            isFirstTime: true
          }));
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load discovery settings',
        isLoading: false
      }));
    }
  }, []);

  // Update discovery percentage
  const updateOutlierPercentage = useCallback(async (percentage: DiscoveryPercentage) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (window.electronAPI && window.electronAPI.saveDiscoverySetting) {
        // Save to Electron database
        const result = await window.electronAPI.saveDiscoverySetting(percentage);
        
        if (result.success) {
          setState(prev => ({
            ...prev,
            outlierPercentage: percentage,
            isLoading: false,
            isFirstTime: false
          }));
          return true;
        } else {
          throw new Error('Failed to save discovery setting');
        }
      } else {
        // Save to localStorage in development
        const settings = { outlierPercentage: percentage };
        localStorage.setItem('discoverySettings', JSON.stringify(settings));
        
        setState(prev => ({
          ...prev,
          outlierPercentage: percentage,
          isLoading: false,
          isFirstTime: false
        }));
        return true;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save discovery setting',
        isLoading: false
      }));
      return false;
    }
  }, []);

  // Get discovery explanation based on percentage
  const getDiscoveryExplanation = useCallback((percentage: DiscoveryPercentage) => {
    switch (percentage) {
      case 0:
        return {
          title: 'Discovery Off',
          description: 'Only personalized recommendations based on your preferences',
          impact: 'Most relevant results, focused on your style'
        };
      case 5:
        return {
          title: 'Light Discovery',
          description: '5% of results will be inspiration items to broaden your horizons',
          impact: 'Mostly personalized with occasional new ideas'
        };
      case 10:
        return {
          title: 'Moderate Discovery',
          description: '10% of results will be inspiration items for exploration',
          impact: 'Good balance of personalized and discovery items'
        };
      default:
        return {
          title: 'Discovery',
          description: 'Explore new styles and ideas',
          impact: 'Balanced recommendations'
        };
    }
  }, []);

  // Check if discovery is enabled
  const isDiscoveryEnabled = useCallback(() => {
    return state.outlierPercentage > 0;
  }, [state.outlierPercentage]);

  // Get inspiration items for a product list
  const mixWithInspiration = useCallback((products: any[], totalCount: number = 20) => {
    if (state.outlierPercentage === 0) {
      return products.map(p => ({ ...p, isInspiration: false }));
    }

    const inspirationCount = Math.floor(totalCount * (state.outlierPercentage / 100));
    const regularCount = totalCount - inspirationCount;

    // Mark some products as inspiration (this is a simple mock implementation)
    return products.map((product, index) => ({
      ...product,
      isInspiration: index >= regularCount && index < totalCount,
      inspirationReason: index >= regularCount 
        ? (index % 3 === 0 ? 'trending' : index % 3 === 1 ? 'different_style' : 'visual_appeal')
        : undefined
    }));
  }, [state.outlierPercentage]);

  // Mark first time as complete
  const markFirstTimeComplete = useCallback(() => {
    setState(prev => ({ ...prev, isFirstTime: false }));
    
    // Also save this state
    if (!window.electronAPI) {
      const settings = { outlierPercentage: state.outlierPercentage };
      localStorage.setItem('discoverySettings', JSON.stringify(settings));
    }
  }, [state.outlierPercentage]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    return await updateOutlierPercentage(0);
  }, [updateOutlierPercentage]);

  // Load settings on initialization
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    // State
    outlierPercentage: state.outlierPercentage,
    isLoading: state.isLoading,
    error: state.error,
    isFirstTime: state.isFirstTime,

    // Actions
    updateOutlierPercentage,
    loadSettings,
    markFirstTimeComplete,
    clearError,
    resetToDefaults,

    // Utilities
    getDiscoveryExplanation,
    isDiscoveryEnabled,
    mixWithInspiration
  };
};