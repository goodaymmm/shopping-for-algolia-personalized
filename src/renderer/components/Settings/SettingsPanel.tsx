import React from 'react'
import { ArrowLeft, Monitor, Sun, Moon } from 'lucide-react'
import { AppSettings } from '../../types/ui'

interface SettingsPanelProps {
  settings: AppSettings
  onSettingsChange: (updates: Partial<AppSettings>) => void
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  onBack: () => void
  isDark: boolean
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onThemeChange,
  onBack,
  isDark
}) => {
  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  const fontSizes = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ] as const

  return (
    <div className="h-full bg-white dark:bg-neutral-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
          </button>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Settings</h2>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Appearance */}
          <section>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Appearance</h3>
            
            {/* Theme */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {themes.map((theme) => {
                  const Icon = theme.icon
                  return (
                    <button
                      key={theme.value}
                      onClick={() => onThemeChange(theme.value)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                        settings.theme === theme.value
                          ? 'border-algolia-500 bg-algolia-50 dark:bg-algolia-900/20 text-algolia-600 dark:text-algolia-400'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Font Size */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Font Size
              </label>
              <div className="grid grid-cols-3 gap-3">
                {fontSizes.map((fontSize) => (
                  <button
                    key={fontSize.value}
                    onClick={() => onSettingsChange({ fontSize: fontSize.value })}
                    className={`p-3 rounded-lg border transition-all ${
                      settings.fontSize === fontSize.value
                        ? 'border-algolia-500 bg-algolia-50 dark:bg-algolia-900/20 text-algolia-600 dark:text-algolia-400'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{fontSize.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Chat */}
          <section>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Chat</h3>
            
            <div className="space-y-4">
              {/* Send on Enter */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Send on Enter
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Press Enter to send messages (Shift+Enter for new line)
                  </div>
                </div>
                <button
                  onClick={() => onSettingsChange({ sendOnEnter: !settings.sendOnEnter })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.sendOnEnter ? 'bg-algolia-500' : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.sendOnEnter ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Show Timestamps */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Show Timestamps
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Display message timestamps
                  </div>
                </div>
                <button
                  onClick={() => onSettingsChange({ showTimestamps: !settings.showTimestamps })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.showTimestamps ? 'bg-algolia-500' : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.showTimestamps ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Save */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Auto Save
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Automatically save chat sessions
                  </div>
                </div>
                <button
                  onClick={() => onSettingsChange({ autoSave: !settings.autoSave })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoSave ? 'bg-algolia-500' : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Discovery */}
          <section>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Discovery</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Discovery Mode
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Include diverse products for inspiration
                </div>
              </div>
              <button
                onClick={() => onSettingsChange({ discoveryMode: !settings.discoveryMode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.discoveryMode ? 'bg-algolia-500' : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.discoveryMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}