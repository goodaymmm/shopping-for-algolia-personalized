import React from 'react'
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  Trash2, 
  Search, 
  Database,
  MessageCircle, 
  History, 
  ShoppingBag,
  Moon,
  Sun,
  Monitor
} from 'lucide-react'
import { ChatSession } from '../../types'
import { useTheme } from '../../hooks/useTheme'

type ViewType = 'chat' | 'history' | 'database' | 'settings'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
  sessions?: ChatSession[]
  currentSessionId?: string | null
  onSessionSelect?: (sessionId: string) => void
  onNewSession?: () => void
  onDeleteSession?: (sessionId: string) => void
  onSettingsClick?: () => void
  onDatabaseStatsClick?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  sessions = [],
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onSettingsClick,
  onDatabaseStatsClick
}) => {
  const { theme, setTheme } = useTheme()
  const [searchTerm, setSearchTerm] = React.useState('')

  const menuItems = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'database', label: 'My Database', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

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
    <div className="w-80 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full">
      {/* Logo Section */}
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

      {/* New Chat Button */}
      <div className="px-4 mb-4">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 shadow-subtle"
        >
          <Plus className="w-5 h-5" strokeWidth={1.5} />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Search */}
      {sessions.length > 0 && (
        <div className="px-4 mb-4">
          <div className="relative text-neutral-600 dark:text-neutral-400">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-algolia-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* Chat Sessions */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-thin">
        {filteredSessions.length > 0 ? (
          <div className="space-y-1 mb-4">
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-2 mb-2">
              Recent Chats
            </div>
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all ${
                  currentSessionId === session.id
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400'
                }`}
                onClick={() => onSessionSelect?.(session.id)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {session.title}
                  </div>
                  <div className="text-xs opacity-60">
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession?.(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-red-500 dark:hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          currentView === 'chat' && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" strokeWidth={1} />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No chats yet
              </p>
            </div>
          )
        )}

        {/* Navigation */}
        <div className="space-y-0.5 mb-4">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-2 mb-2">
            Navigation
          </div>
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
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        {/* Theme Toggle */}
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
        
        {/* Version Info */}
        <div className="text-xxs text-neutral-400 dark:text-neutral-600 text-center mt-4">
          Version 1.0.0
        </div>
      </div>
    </div>
  )
}