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
import { DEFAULT_PRODUCT_IMAGE, MOCK_PRODUCT_IMAGES } from './utils/defaultImages';
import { GeminiService, ImageAnalysis } from './services/gemini';
import { AlgoliaService } from './services/algolia';
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
  const algoliaService = new AlgoliaService();
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
        // Fallback for development environment - use Gemini API directly
        console.warn('Electron API not available, using direct API integration');
        if (imageDataUrl) {
          try {
            // Extract base64 from data URL
            const imageData = imageDataUrl.split(',')[1];
            
            // Try Gemini API first
            const analysis = await geminiService.analyzeImage(imageData, content);
            
            // Use analysis to search Algolia
            const searchQuery = analysis.searchKeywords.join(' ') + ' ' + content;
            products = await algoliaService.searchProducts(searchQuery);
            
            console.log('Real Gemini analysis:', analysis);
          } catch (error) {
            console.warn('Gemini API failed, falling back to mock:', error);
            // Fallback to mock analysis
            const mockAnalysis = GeminiService.getMockAnalysis(content);
            const searchQuery = mockAnalysis.searchKeywords.join(' ') + ' ' + content;
            products = await algoliaService.searchProducts(searchQuery);
          }
        } else {
          // Text-only search
          products = await algoliaService.searchProducts(content);
        }
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
      if (imageDataUrl) {
        responseText = `I can see the image you've shared. Based on the visual analysis, I found ${finalResults.length} products for you!`;
      } else {
        responseText = `Found ${finalResults.length} products matching "${content}"`;
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
        content: 'Sorry, there was an error searching for products. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
      };

      addMessageToSession(sessionId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock products for development environment
  const getMockProducts = (query: string) => {
    return [
      {
        id: '1',
        name: `${query} - Premium Product`,
        description: `High-quality ${query} with excellent reviews`,
        price: 99.99,
        image: MOCK_PRODUCT_IMAGES.generic,
        categories: ['electronics', 'featured'],
        url: '#'
      },
      {
        id: '2',
        name: `${query} - Best Seller`,
        description: `Popular ${query} with great customer satisfaction`,
        price: 79.99,
        image: MOCK_PRODUCT_IMAGES.generic,
        categories: ['electronics', 'bestseller'],
        url: '#'
      },
      {
        id: '3',
        name: `${query} - Budget Option`,
        description: `Affordable ${query} with good value`,
        price: 49.99,
        image: MOCK_PRODUCT_IMAGES.generic,
        categories: ['electronics', 'budget'],
        url: '#'
      }
    ];
  };

  // Mock image analysis products (simulating Gemini API response)
  const getMockImageAnalysisProducts = (query: string, imageDataUrl: string) => {
    // Mock image analysis - simulate different product types based on query
    const mockAnalysisResults = [
      {
        category: 'fashion',
        products: [
          {
            id: 'img-1',
            name: 'Stylish Leather Jacket',
            description: 'Premium leather jacket with modern design',
            price: 199.99,
            image: MOCK_PRODUCT_IMAGES.jacket,
            categories: ['fashion', 'outerwear'],
            url: '#'
          },
          {
            id: 'img-2',
            name: 'Designer Sunglasses',
            description: 'Trendy sunglasses with UV protection',
            price: 89.99,
            image: MOCK_PRODUCT_IMAGES.sunglasses,
            categories: ['fashion', 'accessories'],
            url: '#'
          }
        ]
      },
      {
        category: 'electronics',
        products: [
          {
            id: 'img-3',
            name: 'Wireless Headphones',
            description: 'High-quality wireless headphones with noise cancellation',
            price: 149.99,
            image: MOCK_PRODUCT_IMAGES.headphones,
            categories: ['electronics', 'audio'],
            url: '#'
          },
          {
            id: 'img-4',
            name: 'Smart Watch',
            description: 'Feature-rich smartwatch with fitness tracking',
            price: 299.99,
            image: MOCK_PRODUCT_IMAGES.watch,
            categories: ['electronics', 'wearables'],
            url: '#'
          }
        ]
      },
      {
        category: 'home',
        products: [
          {
            id: 'img-5',
            name: 'Modern Table Lamp',
            description: 'Elegant table lamp with adjustable brightness',
            price: 79.99,
            image: MOCK_PRODUCT_IMAGES.lamp,
            categories: ['home', 'lighting'],
            url: '#'
          },
          {
            id: 'img-6',
            name: 'Decorative Vase',
            description: 'Beautiful ceramic vase for home decoration',
            price: 45.99,
            image: MOCK_PRODUCT_IMAGES.vase,
            categories: ['home', 'decor'],
            url: '#'
          }
        ]
      }
    ];

    // Simple logic to determine category based on query or default to electronics
    let selectedCategory = 'electronics';
    if (query.toLowerCase().includes('fashion') || query.toLowerCase().includes('clothes') || query.toLowerCase().includes('jacket')) {
      selectedCategory = 'fashion';
    } else if (query.toLowerCase().includes('home') || query.toLowerCase().includes('decor') || query.toLowerCase().includes('lamp')) {
      selectedCategory = 'home';
    }

    const categoryData = mockAnalysisResults.find(cat => cat.category === selectedCategory);
    return categoryData ? categoryData.products : mockAnalysisResults[0].products;
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