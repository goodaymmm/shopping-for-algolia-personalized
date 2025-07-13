import React, { useState } from 'react'

type ViewType = 'chat' | 'history' | 'database' | 'settings'

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('chat')

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Shopping for AIgolia
          </h1>
          <p className="text-sm text-gray-500">personalized</p>
        </div>
        <nav className="mt-8">
          {[
            { id: 'chat', label: 'Chat', icon: '💬' },
            { id: 'history', label: 'History', icon: '📚' },
            { id: 'database', label: 'My Database', icon: '🗃️' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewType)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
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
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          {currentView === 'chat' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  AI Shopping Assistant
                </h2>
                <p className="text-gray-600 mb-6">
                  Upload an image or describe what you're looking for
                </p>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                  <div className="text-6xl mb-4">🛍️</div>
                  <p className="text-gray-500">
                    Phase A environment setup completed!
                    <br />
                    Ready for Phase B implementation.
                  </p>
                </div>
              </div>
            </div>
          )}
          {currentView === 'history' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">📚</div>
                Chat History - Coming in Phase B
              </div>
            </div>
          )}
          {currentView === 'database' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">🗃️</div>
                My Database - Coming in Phase B
              </div>
            </div>
          )}
          {currentView === 'settings' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">⚙️</div>
                Settings - Coming in Phase B
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}