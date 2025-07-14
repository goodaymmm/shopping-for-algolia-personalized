import React, { useState } from 'react'
import { Sidebar, ErrorBoundary } from './components/Common'
import { ChatInterface } from './components/Chat'
import { ChatHistory } from './components/History'
import { MyDatabase } from './components/Database'
import { Settings } from './components/Settings'

type ViewType = 'chat' | 'history' | 'database' | 'settings'

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('chat')

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-gray-50">
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />
        
        <main className="flex-1 flex flex-col">
          {currentView === 'chat' && <ChatInterface />}
          {currentView === 'history' && <ChatHistory />}
          {currentView === 'database' && <MyDatabase />}
          {currentView === 'settings' && <Settings />}
        </main>
      </div>
    </ErrorBoundary>
  )
}