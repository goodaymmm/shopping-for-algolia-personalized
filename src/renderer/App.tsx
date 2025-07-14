import React, { useState, useEffect } from 'react'
import { Sidebar, ErrorBoundary } from './components/Common'
import { ChatInterface } from './components/Chat'
import { ChatHistory } from './components/History'
import { MyDatabase } from './components/Database'
import { Settings } from './components/Settings'
import { useTheme } from './hooks'

type ViewType = 'chat' | 'history' | 'database' | 'settings'

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('chat')
  const { theme } = useTheme()

  // Initialize theme on app load
  useEffect(() => {
    // Theme is automatically applied by useTheme hook
  }, [])

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-white dark:bg-neutral-900 transition-colors duration-200">
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />
        
        <main className="flex-1 flex flex-col bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="flex-1">
            {currentView === 'chat' && <ChatInterface />}
            {currentView === 'history' && <ChatHistory />}
            {currentView === 'database' && <MyDatabase />}
            {currentView === 'settings' && <Settings />}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}