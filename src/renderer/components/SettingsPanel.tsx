import React from 'react';
import { ArrowLeft, Monitor, Moon, Sun, Type, Keyboard, Clock, Save } from 'lucide-react';
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
  return (
    <div className={`flex-1 overflow-y-auto ${
      isDark ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-2xl font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Settings
          </h1>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Appearance */}
        <section>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            <Monitor className="w-5 h-5" />
            Appearance
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
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
                        ? isDark
                          ? 'bg-gray-800 border-gray-600 text-white shadow-md'
                          : 'bg-blue-50 border-blue-200 text-blue-900 shadow-md'
                        : isDark
                          ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Font Size
              </label>
              <select
                value={settings.fontSize}
                onChange={(e) => onSettingsChange({ fontSize: e.target.value as any })}
                className={`w-full p-3 rounded-xl border transition-all shadow-sm focus:shadow-md ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            <Keyboard className="w-5 h-5" />
            Chat Behavior
          </h2>
          
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 rounded-xl border shadow-sm ${
              isDark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div>
                <div className={`font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Send on Enter
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
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

            <div className={`flex items-center justify-between p-4 rounded-xl border shadow-sm ${
              isDark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div>
                <div className={`font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Show Timestamps
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
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
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            <Save className="w-5 h-5" />
            Data
          </h2>
          
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 rounded-xl border shadow-sm ${
              isDark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div>
                <div className={`font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Auto-save Chats
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
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

        {/* About */}
        <section>
          <h2 className={`text-lg font-semibold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            About
          </h2>
          <div className={`p-4 rounded-xl border shadow-sm ${
            isDark
              ? 'bg-gray-800 border-gray-700'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`text-sm ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
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