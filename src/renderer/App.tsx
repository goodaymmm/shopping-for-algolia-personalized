import React, { useState, useEffect } from 'react'
import { ChatHeader } from './components/Chat/ChatHeader'
import { ChatContainer } from './components/Chat/ChatContainer'
import { ChatInput } from './components/Chat/ChatInput'
import { Sidebar } from './components/Common/Sidebar'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { DatabaseStatsPanel } from './components/Database/DatabaseStatsPanel'
import { ErrorBoundary } from './components/Common'
import { ChatMessage, DiscoveryPercentage, Product } from './types'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { useChatSessions } from './hooks/useChatSessions'

type ViewType = 'chat' | 'history' | 'database' | 'settings'
type AppView = 'chat' | 'settings' | 'database-stats'

export const App: React.FC = () => {
  const { theme, isDark, changeTheme } = useTheme()
  const { settings, updateSettings } = useSettings()
  const {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    deleteSession,
    addMessageToSession,
  } = useChatSessions()

  const [currentView, setCurrentView] = useState<AppView>('chat')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession()
    }
  }, [])

  const handleSendMessage = async (content: string, imageFile?: File) => {
    let sessionId = currentSessionId
    
    // Create new session if none exists
    if (!sessionId) {
      const newSession = createNewSession()
      sessionId = newSession.id
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
      timestamp: new Date()
    }

    addMessageToSession(sessionId, userMessage)
    setIsLoading(true)

    try {
      // Search for products using Algolia
      let imageData: string | undefined
      if (imageFile) {
        imageData = await fileToBase64(imageFile)
      }

      const products = await window.electronAPI.searchProducts(content, imageData)
      setSearchResults(products)

      // Create assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: imageFile 
          ? `I can see the image you've shared. Found ${products.length} similar products for you!`
          : `Found ${products.length} products matching "${content}"`,
        timestamp: new Date()
      }

      addMessageToSession(sessionId, assistantMessage)

      // Save chat to database
      if (window.electronAPI) {
        await window.electronAPI.saveChat(
          { 
            name: content.substring(0, 50) + '...', 
            category: 'search' 
          },
          userMessage
        )
      }
    } catch (error) {
      console.error('Search error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error searching for products. Please try again.',
        timestamp: new Date()
      }

      addMessageToSession(sessionId, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleNewSession = () => {
    createNewSession()
    setCurrentView('chat')
    setSearchResults([])
  }

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setCurrentView('chat')
    setSearchResults([])
  }

  const handleSettingsClick = () => {
    setCurrentView('settings')
  }

  const handleDatabaseStatsClick = () => {
    setCurrentView('database-stats')
  }

  const handleSettingsBack = () => {
    setCurrentView('chat')
  }

  const handleSettingsChange = (updates: any) => {
    updateSettings(updates)
    if (updates.theme) {
      changeTheme(updates.theme)
    }
  }

  const handleDiscoveryModeToggle = async () => {
    const newValue = settings.discoveryMode ? 0 : 5 as DiscoveryPercentage
    updateSettings({ discoveryMode: newValue > 0 })
    
    if (window.electronAPI) {
      await window.electronAPI.saveDiscoverySetting(newValue)
    }
  }

  const mapViewType = (view: AppView): ViewType => {
    switch (view) {
      case 'chat': return 'chat'
      case 'settings': return 'settings'
      case 'database-stats': return 'database'
      default: return 'chat'
    }
  }

  return (
    <ErrorBoundary>
      <div className={`flex h-screen overflow-hidden ${
        isDark ? 'dark bg-neutral-900' : 'bg-white'
      }`}>
        <Sidebar
          currentView={mapViewType(currentView)}
          onNavigate={(view) => {
            switch (view) {
              case 'chat': setCurrentView('chat'); break
              case 'settings': setCurrentView('settings'); break
              case 'database': setCurrentView('database-stats'); break
              case 'history': setCurrentView('chat'); break
            }
          }}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onDeleteSession={deleteSession}
          onSettingsClick={handleSettingsClick}
          onDatabaseStatsClick={handleDatabaseStatsClick}
        />
        
        <div className="flex flex-col flex-1">
          {currentView === 'chat' ? (
            <>
              <ChatHeader />
              <ChatContainer 
                messages={currentSession?.messages || []}
                searchResults={searchResults}
                showTimestamps={settings.showTimestamps}
                fontSize={settings.fontSize}
                isLoading={isLoading}
              />
              <ChatInput 
                onSendMessage={handleSendMessage}
                sendOnEnter={settings.sendOnEnter}
                discoveryMode={settings.discoveryMode}
                onDiscoveryModeToggle={handleDiscoveryModeToggle}
                isLoading={isLoading}
              />
            </>
          ) : currentView === 'database-stats' ? (
            <DatabaseStatsPanel
              onBack={handleSettingsBack}
            />
          ) : (
            <SettingsPanel
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onThemeChange={changeTheme}
              onBack={handleSettingsBack}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}