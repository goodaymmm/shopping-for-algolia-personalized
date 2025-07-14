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
    <aside className="w-60 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full">
      {/* Logo Section - Minimal design */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-algolia-500 rounded-md flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Shopping AI
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Algolia Search
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation - Clean and minimal */}
      <nav className="flex-1 px-3">
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as ViewType)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                  transition-colors duration-200
                  ${isActive 
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100' 
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                  }
                `}
              >
                <Icon 
                  size={18} 
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
      
      {/* Footer - Minimal and clean */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        {/* Theme Toggle - Subtle design */}
        <button
          onClick={cycleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm
                   text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100
                   hover:bg-neutral-100 dark:hover:bg-neutral-800/50
                   transition-colors duration-200"
          aria-label="Toggle theme"
        >
          <ThemeIcon size={18} strokeWidth={1.5} />
          <span className="capitalize">{theme} theme</span>
        </button>
        
        {/* Version Info - Very subtle */}
        <div className="text-xxs text-neutral-400 dark:text-neutral-600 text-center mt-4">
          Version 1.0.0
        </div>
      </div>
    </aside>
  )
}