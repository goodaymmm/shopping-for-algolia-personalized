import React, { useState, useEffect } from 'react'
import { ChatHeader } from './components/Chat/ChatHeader'
import { ChatContainer } from './components/Chat/ChatContainer'
import { ChatInput } from './components/Chat/ChatInput'
import { Sidebar } from './components/Common/Sidebar'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { DatabaseStatsPanel } from './components/Database/DatabaseStatsPanel'
import { ErrorBoundary } from './components/Common'
import { ChatMessage, Product } from './types'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { useChatSessions } from './hooks/useChatSessions'

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

  // Initialize theme on mount
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [isDark])

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession()
    }
  }, [sessions.length, createNewSession])

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
      sender: 'user',
      content,
      image: imageFile ? URL.createObjectURL(imageFile) : undefined,
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
        sender: 'assistant',
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
        sender: 'assistant',
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



  return (
    <ErrorBoundary>
      <div className={`flex h-screen overflow-hidden ${
        isDark ? 'bg-gray-900' : 'bg-white'
      }`}>
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onDeleteSession={deleteSession}
          onSettingsClick={handleSettingsClick}
          onDatabaseStatsClick={handleDatabaseStatsClick}
          isDark={isDark}
        />
        
        <div className="flex flex-col flex-1">
          {currentView === 'chat' ? (
            <>
              <ChatHeader isDark={isDark} />
              <ChatContainer 
                messages={currentSession?.messages || []}
                searchResults={searchResults}
                showTimestamps={settings.showTimestamps}
                fontSize={settings.fontSize}
                isLoading={isLoading}
                isDark={isDark}
              />
              <ChatInput 
                onSendMessage={handleSendMessage}
                sendOnEnter={settings.sendOnEnter}
                discoveryMode={settings.discoveryMode}
                onDiscoveryModeToggle={() => updateSettings({ discoveryMode: !settings.discoveryMode })}
                isLoading={isLoading}
                isDark={isDark}
              />
            </>
          ) : currentView === 'database-stats' ? (
            <DatabaseStatsPanel
              onBack={handleSettingsBack}
              isDark={isDark}
            />
          ) : (
            <SettingsPanel
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onThemeChange={changeTheme}
              onBack={handleSettingsBack}
              isDark={isDark}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}