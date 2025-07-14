import React from 'react'
import { 
  MessageCircle, 
  History, 
  Database, 
  Settings,
  Moon,
  Sun,
  Monitor,
  ShoppingBag
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

type ViewType = 'chat' | 'history' | 'database' | 'settings'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { theme, setTheme } = useTheme()

  const menuItems = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'database', label: 'My Database', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return Sun
      case 'dark': return Moon
      default: return Monitor
    }
  }

  const ThemeIcon = getThemeIcon()

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return (
    <aside className="w-64 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-800 flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 dark:border-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-algolia-500 to-algolia-700 rounded-xl flex items-center justify-center shadow-lg shadow-algolia-500/20">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Shopping AI
            </h1>
            <p className="text-xs text-gray-500 dark:text-dark-400">
              Powered by Algolia
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ViewType)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-algolia-50 dark:bg-algolia-900/20 text-algolia-600 dark:text-algolia-400 shadow-sm' 
                    : 'text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-800'
                  }
                `}
              >
                <Icon 
                  size={20} 
                  className={`
                    transition-transform duration-200
                    ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                  `} 
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-algolia-500 rounded-full animate-pulse-soft" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-800">
        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                   text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-800
                   transition-all duration-200 group mb-3"
          aria-label="Toggle theme"
        >
          <ThemeIcon size={20} className="transition-transform duration-200 group-hover:scale-110" />
          <span className="capitalize">{theme} Mode</span>
        </button>
        
        {/* Version Info */}
        <div className="text-xs text-gray-400 dark:text-dark-500 text-center">
          Phase B • v1.0.0
        </div>
      </div>
    </aside>
  )
}