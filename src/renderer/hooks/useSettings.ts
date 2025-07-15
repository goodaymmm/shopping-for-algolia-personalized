import { useState, useEffect } from 'react';
import { AppSettings } from '../types/ui';

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
  sendOnEnter: true,
  showTimestamps: true,
  autoSave: true,
  discoveryMode: false,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
};