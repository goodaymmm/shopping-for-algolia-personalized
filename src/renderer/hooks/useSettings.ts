import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

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
    const saved = safeGetItem<Partial<AppSettings>>('app-settings', {});
    return { ...defaultSettings, ...saved };
  });

  useEffect(() => {
    safeSetItem('app-settings', settings);
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
};