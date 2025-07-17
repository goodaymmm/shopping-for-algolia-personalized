import React, { useState, useEffect } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { ChatHistory } from './components/ChatHistory';
import { MyDatabase } from './components/MyDatabase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Message, AppView, Product, ProductWithContext, DiscoveryPercentage } from './types';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useChatSessions } from './hooks/useChatSessions';
import { DEFAULT_PRODUCT_IMAGE } from './utils/defaultImages';
import { GeminiService, ImageAnalysis } from './services/gemini';
import { OutlierMixer } from './services/outlier-mixer';

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
  const [searchResults, setSearchResults] = useState<(Product | ProductWithContext)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [discoveryPercentage, setDiscoveryPercentage] = useState<DiscoveryPercentage>(0);
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Service instances for fallback when Electron API is not available
  const geminiService = new GeminiService();
  const outlierMixer = new OutlierMixer();

  // Load discovery percentage from Electron API
  useEffect(() => {
    const loadDiscoveryPercentage = async () => {
      if (window.electronAPI?.getDiscoverySetting) {
        try {
          const percentage = await window.electronAPI.getDiscoverySetting();
          setDiscoveryPercentage(percentage);
        } catch (error) {
          console.error('Failed to load discovery percentage:', error);
        }
      }
    };

    loadDiscoveryPercentage();
  }, []);

  // Initialize Gemini service with API key
  useEffect(() => {
    const initializeGeminiService = async () => {
      if (window.electronAPI?.getAPIKeys) {
        try {
          const result = await window.electronAPI.getAPIKeys();
          if (result.success && result.keys && result.keys.gemini) {
            await geminiService.initialize(result.keys.gemini);
          }
        } catch (error) {
          console.error('Failed to initialize Gemini service:', error);
        }
      }
    };

    initializeGeminiService();
  }, []);

  // Load saved products
  useEffect(() => {
    const loadSavedProducts = async () => {
      if (window.electronAPI?.getProducts) {
        try {
          const products = await window.electronAPI.getProducts();
          const productIds = new Set(products.map((p: any) => p.id));
          setSavedProductIds(productIds);
        } catch (error) {
          console.error('Failed to load saved products:', error);
        }
      }
    };

    loadSavedProducts();
  }, [currentView]); // Reload when view changes to keep in sync

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  const handleSendMessage = async (content: string, imageDataUrl?: string) => {
    let sessionId = currentSessionId;
    
    // Create new session if none exists
    if (!sessionId) {
      const newSession = createNewSession();
      sessionId = newSession.id;
    }

    // Create user message with image data URL
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      image: imageDataUrl,
    };

    addMessageToSession(sessionId, userMessage);
    setIsLoading(true);

    try {
      let products = [];
      
      // Check if Electron API is available
      if (window.electronAPI && window.electronAPI.searchProducts) {
        // Search for products using Electron API
        let imageData: string | undefined;
        if (imageDataUrl) {
          // Extract base64 from data URL
          imageData = imageDataUrl.split(',')[1];
        }

        products = await window.electronAPI.searchProducts(content, imageData);
      } else {
        // No Electron API available
        console.error('Electron API not available');
        products = [];
      }
      
      // Apply discovery mixing for diverse recommendations
      let finalResults: (Product | ProductWithContext)[];
      if (discoveryPercentage > 0 && products.length > 0) {
        try {
          finalResults = await outlierMixer.mixResults(products, discoveryPercentage, content);
          console.log(`Applied ${discoveryPercentage}% discovery mixing:`, {
            total: finalResults.length,
            personalized: finalResults.filter(p => !('displayType' in p) || p.displayType === 'personalized').length,
            inspiration: finalResults.filter(p => 'displayType' in p && p.displayType === 'inspiration').length
          });
        } catch (error) {
          console.warn('Discovery mixing failed, using original results:', error);
          finalResults = products;
        }
      } else {
        finalResults = products;
      }
      
      setSearchResults(finalResults);

      // Create assistant response
      const personalizedCount = finalResults.filter(p => !('displayType' in p) || p.displayType === 'personalized').length;
      const inspirationCount = finalResults.filter(p => 'displayType' in p && p.displayType === 'inspiration').length;
      
      let responseText = '';
      if (finalResults.length === 0) {
        if (imageDataUrl) {
          responseText = `画像を分析しましたが、商品が見つかりませんでした。検索キーワードを調整してもう一度お試しください。`;
        } else {
          responseText = `"${content}" に一致する商品が見つかりませんでした。`;
        }
      } else {
        if (imageDataUrl) {
          responseText = `画像を分析し、${finalResults.length}件の商品を見つけました！`;
        } else {
          responseText = `"${content}" に一致する${finalResults.length}件の商品を見つけました。`;
        }
      }
      
      if (inspirationCount > 0) {
        responseText += ` This includes ${personalizedCount} personalized recommendations and ${inspirationCount} inspiration items for discovery.`;
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        sender: 'assistant',
        timestamp: new Date(),
      };

      addMessageToSession(sessionId, assistantMessage);

      // Save chat to database (only if Electron API is available)
      if (window.electronAPI && window.electronAPI.saveChat) {
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
        content: '商品検索中にエラーが発生しました。APIキーが正しく設定されているか確認してください。',
        sender: 'assistant',
        timestamp: new Date(),
      };

      addMessageToSession(sessionId, errorMessage);
    } finally {
      setIsLoading(false);
    }
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

  const handleProductSave = async (product: Product) => {
    console.log('handleProductSave called with product:', product);
    
    if (!window.electronAPI?.saveProduct) {
      console.error('electronAPI.saveProduct is not available');
      setSaveMessage({ type: 'error', text: 'Save functionality not available' });
      setTimeout(() => setSaveMessage(null), 3000);
      return { success: false, error: 'electronAPI not available' };
    }

    try {
      console.log('Calling electronAPI.saveProduct...');
      const result = await window.electronAPI.saveProduct(product);
      console.log('Save result:', result);
      
      if (result.success) {
        setSavedProductIds(prev => new Set([...prev, product.id]));
        setSaveMessage({ type: 'success', text: 'Product saved successfully!' });
        console.log('Product saved successfully:', product.id);
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        console.error('Save failed:', result.error);
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save product' });
        setTimeout(() => setSaveMessage(null), 3000);
      }
      return result;
    } catch (error: any) {
      console.error('Exception during save:', error);
      const errorMessage = error.message || 'Failed to save product';
      setSaveMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setSaveMessage(null), 3000);
      return { success: false, error: errorMessage };
    }
  };

  const handleProductRemove = async (productId: string) => {
    if (window.electronAPI?.removeProduct) {
      const result = await window.electronAPI.removeProduct(productId);
      if (result.success) {
        setSavedProductIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }
      return result;
    }
    return { success: false };
  };


  const handleHistoryClick = () => {
    setCurrentView('history');
  };

  const handleDatabaseClick = () => {
    setCurrentView('database');
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

  const handleDiscoveryPercentageChange = async (percentage: DiscoveryPercentage) => {
    setDiscoveryPercentage(percentage);
    if (window.electronAPI?.saveDiscoverySetting) {
      try {
        await window.electronAPI.saveDiscoverySetting(percentage);
      } catch (error) {
        console.error('Failed to save discovery percentage:', error);
      }
    }
  };

  return (
    <ErrorBoundary isDark={isDark}>
      <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onDeleteSession={deleteSession}
          onSettingsClick={handleSettingsClick}
          onHistoryClick={handleHistoryClick}
          onDatabaseClick={handleDatabaseClick}
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
                isLoading={isLoading}
                isDark={isDark}
                savedProductIds={savedProductIds}
                onProductSave={handleProductSave}
                onProductRemove={handleProductRemove}
                saveMessage={saveMessage}
              />
              <ChatInput 
                onSendMessage={handleSendMessage}
                sendOnEnter={settings.sendOnEnter}
                discoveryMode={settings.discoveryMode}
                onDiscoveryModeToggle={handleDiscoveryModeToggle}
                discoveryPercentage={discoveryPercentage}
                onDiscoveryPercentageChange={handleDiscoveryPercentageChange}
                isDark={isDark}
              />
            </>
          ) : currentView === 'history' ? (
            <ChatHistory
              sessions={sessions}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={deleteSession}
              onBack={handleSettingsBack}
              isDark={isDark}
            />
          ) : currentView === 'database' ? (
            <MyDatabase
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
  );
}

export default App;