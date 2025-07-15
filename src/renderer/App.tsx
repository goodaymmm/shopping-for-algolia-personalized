import React, { useState, useEffect } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { DatabaseStatsPanel } from './components/DatabaseStatsPanel';
import { Message, AppView, Product } from './types';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useChatSessions } from './hooks/useChatSessions';

function App() {
  const { theme, isDark, changeTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    deleteSession,
    addMessageToSession,
  } = useChatSessions();

  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  const handleSendMessage = async (content: string, imageFile?: File) => {
    let sessionId = currentSessionId;
    
    // Create new session if none exists
    if (!sessionId) {
      const newSession = createNewSession();
      sessionId = newSession.id;
    }

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      image: imageFile ? URL.createObjectURL(imageFile) : undefined,
    };

    addMessageToSession(sessionId, userMessage);
    setIsLoading(true);

    try {
      // Search for products using Electron API
      let imageData: string | undefined;
      if (imageFile) {
        imageData = await fileToBase64(imageFile);
      }

      const products = await window.electronAPI.searchProducts(content, imageData);
      setSearchResults(products);

      // Create assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: imageFile 
          ? `I can see the image you've shared. Found ${products.length} similar products for you!`
          : `Found ${products.length} products matching "${content}"`,
        sender: 'assistant',
        timestamp: new Date(),
      };

      addMessageToSession(sessionId, assistantMessage);

      // Save chat to database
      if (window.electronAPI) {
        await window.electronAPI.saveChat(
          { 
            name: content.substring(0, 50) + '...', 
            category: 'search' 
          },
          userMessage
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error searching for products. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
      };

      addMessageToSession(sessionId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getRandomResponse = (userMessage: string) => {
    const responses = [
      "That's a great question! I'd be happy to help you with that.",
      "I understand what you're asking. Let me think about this for a moment.",
      "That's an interesting perspective. Here's what I think about that topic.",
      "I appreciate you sharing that with me. Let me provide some insights.",
      "Thank you for that question. I'll do my best to give you a helpful response.",
    ];
    
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      return "Hello! It's great to meet you. How can I assist you today?";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleNewSession = () => {
    createNewSession();
    setCurrentView('chat');
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentView('chat');
  };

  const handleSettingsClick = () => {
    setCurrentView('settings');
  };

  const handleDatabaseStatsClick = () => {
    setCurrentView('database-stats');
  };

  const handleSettingsBack = () => {
    setCurrentView('chat');
  };

  const handleSettingsChange = (updates: any) => {
    updateSettings(updates);
    if (updates.theme) {
      changeTheme(updates.theme);
    }
  };

  const handleDiscoveryModeToggle = () => {
    updateSettings({ discoveryMode: !settings.discoveryMode });
  };

  return (
    <div className={`flex h-screen overflow-hidden ${
      isDark ? 'dark bg-gray-900' : 'bg-white'
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
              onDiscoveryModeToggle={handleDiscoveryModeToggle}
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
  );
}

export default App;