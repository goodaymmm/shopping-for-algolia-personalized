import React, { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Moon, Sun, Type, Keyboard, Clock, Save, Database, Key, Trash2, RefreshCw, FolderOpen } from 'lucide-react';
import { AppSettings } from '../types';
import { Theme } from '../hooks/useTheme';

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (updates: Partial<AppSettings>) => void;
  onThemeChange: (theme: Theme) => void;
  onBack: () => void;
  isDark: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onThemeChange,
  onBack,
  isDark
}) => {
  const [databasePath, setDatabasePath] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [algoliaApiKey, setAlgoliaApiKey] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  // Load current settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get database path
        if (window.electronAPI?.getDatabasePath) {
          const path = await window.electronAPI.getDatabasePath();
          setDatabasePath(path);
        }
        
        // Get API keys (if available)
        if (window.electronAPI?.getApiKeys) {
          const keys = await window.electronAPI.getApiKeys();
          setGeminiApiKey(keys.gemini || '');
          setAlgoliaApiKey(keys.algolia || '');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleSaveApiKeys = async () => {
    try {
      if (window.electronAPI?.saveApiKeys) {
        await window.electronAPI.saveApiKeys({
          gemini: geminiApiKey,
          algolia: algoliaApiKey
        });
        // Show success message (you could add a toast here)
        console.log('API keys saved successfully');
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Are you sure you want to reset the database? This will delete all saved products and chat history.')) {
      return;
    }
    
    setIsResetting(true);
    try {
      if (window.electronAPI?.resetDatabase) {
        await window.electronAPI.resetDatabase();
        console.log('Database reset successfully');
      }
    } catch (error) {
      console.error('Failed to reset database:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetMLData = async () => {
    if (!confirm('Are you sure you want to reset ML training data? This will delete all personalization data.')) {
      return;
    }
    
    try {
      if (window.electronAPI?.resetMLData) {
        await window.electronAPI.resetMLData();
        console.log('ML data reset successfully');
      }
    } catch (error) {
      console.error('Failed to reset ML data:', error);
    }
  };

  const handleChangeDatabasePath = async () => {
    try {
      if (window.electronAPI?.changeDatabasePath) {
        const newPath = await window.electronAPI.changeDatabasePath();
        if (newPath) {
          setDatabasePath(newPath);
        }
      }
    } catch (error) {
      console.error('Failed to change database path:', error);
    }
  };
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="border-b px-6 py-4 border-gray-200 dark:border-slate-700/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Appearance */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Monitor className="w-5 h-5" />
            Appearance
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => onThemeChange(value as Theme)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all shadow-sm hover:shadow-md ${
                      settings.theme === value
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400 border-blue-400 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500 backdrop-blur-sm'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Font Size
              </label>
              <select
                value={settings.fontSize}
                onChange={(e) => onSettingsChange({ fontSize: e.target.value as any })}
                className="w-full p-3 rounded-xl border transition-all shadow-sm focus:shadow-md bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </section>

        {/* Chat Behavior */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Keyboard className="w-5 h-5" />
            Chat Behavior
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Send on Enter
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Press Enter to send messages (Cmd/Ctrl+Enter for new line)
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sendOnEnter}
                  onChange={(e) => onSettingsChange({ sendOnEnter: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Show Timestamps
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Display message timestamps in chat
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showTimestamps}
                  onChange={(e) => onSettingsChange({ showTimestamps: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Save className="w-5 h-5" />
            Data
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Auto-save Chats
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically save chat history locally
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => onSettingsChange({ autoSave: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Database Settings */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Database className="w-5 h-5" />
            Database
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Database Location
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {databasePath || 'Not available'}
                  </div>
                </div>
                <button
                  onClick={handleChangeDatabasePath}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  Change
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleResetDatabase}
                disabled={isResetting}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white transition-colors"
              >
                {isResetting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Reset Database
              </button>
              
              <button
                onClick={handleResetMLData}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reset ML Data
              </button>
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Key className="w-5 h-5" />
            API Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Gemini API Key
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full p-3 rounded-xl border transition-all shadow-sm focus:shadow-md bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required for image analysis and AI features
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Algolia API Key
              </label>
              <input
                type="password"
                value={algoliaApiKey}
                onChange={(e) => setAlgoliaApiKey(e.target.value)}
                placeholder="Enter your Algolia API key"
                className="w-full p-3 rounded-xl border transition-all shadow-sm focus:shadow-md bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required for product search functionality
              </p>
            </div>
            
            <button
              onClick={handleSaveApiKeys}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors"
            >
              <Save className="w-4 h-4" />
              Save API Keys
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            About
          </h2>
          <div className="p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Shopping AI v1.0.0
              <br />
              Powered by Algolia Search • Built with React, TypeScript, and Tailwind CSS
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};