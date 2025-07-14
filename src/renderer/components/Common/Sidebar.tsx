import React from 'react'

type ViewType = 'chat' | 'history' | 'database' | 'settings'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const menuItems = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'history', label: 'History', icon: '📚' },
    { id: 'database', label: 'My Database', icon: '🗃️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] as const

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Shopping for AIgolia
        </h1>
        <p className="text-sm text-gray-500">personalized</p>
      </div>
      
      <nav className="mt-8">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as ViewType)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
              currentView === item.id
                ? 'bg-algolia-50 text-algolia-700 border-r-2 border-algolia-500'
                : 'text-gray-700'
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="absolute bottom-4 left-4 text-xs text-gray-400">
        Phase B - Prototype
      </div>
    </div>
  )
}