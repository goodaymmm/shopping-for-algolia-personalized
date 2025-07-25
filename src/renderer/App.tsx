import React, { useState, useEffect } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { ProductSidebar } from './components/ProductSidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { ChatHistory } from './components/ChatHistory';
import { MyDatabase } from './components/MyDatabase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Message, AppView, Product, ProductWithContext, DiscoveryPercentage, ImageAnalysisProgress, IPCSearchResult, SearchSession } from './types';
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
    updateSessionSearchResults,
    appendSessionSearchResults,
    clearSessionSearchResults,
  } = useChatSessions();

  // Detect category from search results based on the index of the first result
  const detectCategoryFromSearchResults = (products: (Product | ProductWithContext)[]): string => {
    if (!products || products.length === 0) {
      console.log('[Category Detection] No products found, defaulting to general');
      return 'general';
    }
    
    // Get the source index from the first product
    const firstProduct = products[0];
    const sourceIndex = 'product' in firstProduct ? firstProduct.product.sourceIndex : firstProduct.sourceIndex;
    
    console.log('[Category Detection] First product source index:', sourceIndex);
    
    // Check if sourceIndex is already a direct category name
    const directCategories = ['fashion', 'electronics', 'home', 'sports', 'beauty', 'books', 'food', 'general'];
    if (sourceIndex && directCategories.includes(sourceIndex)) {
      console.log('[Category Detection] Detected direct category:', sourceIndex);
      return sourceIndex;
    }
    
    // Map Algolia index names with products_ prefix to categories
    const indexToCategoryMap: Record<string, string> = {
      'products_fashion': 'fashion',
      'products_electronics': 'electronics',
      'products_home': 'home',
      'products_sports': 'sports',
      'products_beauty': 'beauty',
      'products_books': 'books',
      'products_food': 'food',
      'products': 'general'
    };
    
    if (sourceIndex && indexToCategoryMap[sourceIndex]) {
      const category = indexToCategoryMap[sourceIndex];
      console.log('[Category Detection] Detected category:', category, 'from prefixed index:', sourceIndex);
      return category;
    }
    
    console.log('[Category Detection] Unknown index or no index, defaulting to general');
    return 'general';
  };

  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [discoveryPercentage, setDiscoveryPercentage] = useState<DiscoveryPercentage>(0);
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imageAnalysisProgress, setImageAnalysisProgress] = useState<ImageAnalysisProgress | null>(null);
  const [sidebarProducts, setSidebarProducts] = useState<(Product | ProductWithContext)[]>([]);
  const [isProductSidebarOpen, setIsProductSidebarOpen] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [lastSearchResult, setLastSearchResult] = useState<IPCSearchResult | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState(600); // Default width

  // Get search results from current session
  const searchResults = currentSession?.searchResults || [];

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

  // Initialize Gemini service with API key and setup progress listener
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

    // Setup image analysis progress listener
    let cleanup: (() => void) | undefined;
    let feedbackCleanup: (() => void) | undefined;
    
    if (window.electronAPI?.onImageAnalysisProgress) {
      cleanup = window.electronAPI.onImageAnalysisProgress((data) => {
        setImageAnalysisProgress({
          status: data.status as any,
          message: data.status,
          progress: data.progress
        });
      });
    }

    // Setup search feedback listener
    if (window.electronAPI?.onSearchFeedback) {
      feedbackCleanup = window.electronAPI.onSearchFeedback((feedback: string) => {
        setSearchFeedback(feedback);
      });
    }

    initializeGeminiService();

    return () => {
      if (cleanup) cleanup();
      if (feedbackCleanup) feedbackCleanup();
    };
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
    
    // Reset image analysis progress and search feedback
    setImageAnalysisProgress(null);
    setSearchFeedback(null);

    try {
      let products = [];
      let searchResult: IPCSearchResult = { products: [], imageAnalysis: undefined };
      
      // Let the backend handle follow-up query detection and filtering
      let searchQuery = content;
      
      // Check if Electron API is available
      if (window.electronAPI && window.electronAPI.searchProducts) {
        // Search for products using Electron API
        let imageData: string | undefined;
        if (imageDataUrl) {
          // Send complete data URL (not just base64)
          imageData = imageDataUrl;
          
          // Set initial progress for image analysis
          setImageAnalysisProgress({
            status: 'preparing',
            message: 'Preparing image for analysis...',
            progress: 0
          });
        }

        searchResult = await window.electronAPI.searchProducts(searchQuery, imageData, discoveryPercentage);
        products = searchResult.products || []; // Ensure products is always an array
        
        console.log('[App] Search completed:', {
          productsCount: products.length,
          hasImageAnalysis: !!searchResult.imageAnalysis,
          imageAnalysisKeywords: searchResult.imageAnalysis?.keywords,
          hasConstraints: !!searchResult.constraints
        });
        
        // Store the search result and query for display
        setLastSearchResult(searchResult);
        // For image searches, store the analyzed keywords as the last search query
        if (searchResult.imageAnalysis && searchResult.imageAnalysis.searchQuery) {
          setLastSearchQuery(searchResult.imageAnalysis.searchQuery);
        } else {
          setLastSearchQuery(content);
        }
        
        // Clear progress and feedback when done
        setImageAnalysisProgress(null);
        setSearchFeedback(null);
      } else {
        // No Electron API available
        console.error('Electron API not available');
        products = [];
      }
      
      // Apply discovery mixing for diverse recommendations
      let finalResults: (Product | ProductWithContext)[] = [];
      
      try {
        if (products && products.length > 0) {
          if (discoveryPercentage > 0) {
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
        } else {
          console.log('[App] No products found, finalResults is empty array');
          finalResults = [];
        }
      } catch (error) {
        console.error('[App] Error processing search results:', error);
        finalResults = [];
      }
      
      // Create search session for this search
      const searchSession: SearchSession = {
        sessionId: Date.now().toString(),
        searchQuery: content,
        searchType: imageDataUrl ? 'image' : 'text',
        timestamp: new Date(),
        imageAnalysisKeywords: searchResult.imageAnalysis?.keywords,
        resultCount: finalResults.length
      };
      
      // Add search session metadata to each product
      const finalResultsWithSession = finalResults.map(item => {
        if ('product' in item) {
          // ProductWithContext
          return {
            ...item,
            product: {
              ...item.product,
              searchSession
            }
          };
        } else {
          // Product
          return {
            ...item,
            searchSession
          };
        }
      });
      
      // Save search results to current session - append to existing results
      appendSessionSearchResults(sessionId, finalResultsWithSession);
      
      // Update sidebar products to match session's accumulated results
      // We need to manually append here because state updates are async
      setSidebarProducts(prev => [...prev, ...finalResultsWithSession]);
      if (finalResults.length > 0) {
        setIsProductSidebarOpen(true);
      }

      // Create assistant response
      const personalizedCount = finalResults.filter(p => !('displayType' in p) || p.displayType === 'personalized').length;
      const inspirationCount = finalResults.filter(p => 'displayType' in p && p.displayType === 'inspiration').length;
      
      let responseText = '';
      if (finalResults.length === 0) {
        if (searchResult.constraints?.applied) {
          // Products were found but filtered out
          const filterInfo = [];
          if (searchResult.constraints.priceRange) {
            filterInfo.push(`price $${searchResult.constraints.priceRange.min || 0}-$${searchResult.constraints.priceRange.max || '∞'}`);
          }
          if (searchResult.constraints.colors?.length) {
            filterInfo.push(`colors: ${searchResult.constraints.colors.join(', ')}`);
          }
          if (searchResult.constraints.gender) {
            filterInfo.push(`gender: ${searchResult.constraints.gender}`);
          }
          
          if (searchResult.totalResultsBeforeFilter && searchResult.totalResultsBeforeFilter > 0) {
            responseText = `Found ${searchResult.totalResultsBeforeFilter} products initially, but none matched your filters (${filterInfo.join(', ')}). Try relaxing your constraints.`;
          } else {
            responseText = `No products found matching your search. Filters applied: ${filterInfo.join(', ')}.`;
          }
        } else if (imageDataUrl && searchResult.imageAnalysis) {
          responseText = `I analyzed the image and identified: ${searchResult.imageAnalysis.keywords.join(', ')}. However, I couldn't find any matching products. Please try adjusting your search keywords.`;
        } else if (imageDataUrl) {
          responseText = `I analyzed the image but couldn't find any products. Please try adjusting your search keywords.`;
        } else {
          responseText = `No products found matching "${content}".`;
        }
      } else {
        if (imageDataUrl && searchResult.imageAnalysis) {
          responseText = `I analyzed the image and identified: ${searchResult.imageAnalysis.keywords.join(', ')}. Found ${finalResults.length} products!`;
        } else if (imageDataUrl) {
          responseText = `I analyzed the image and found ${finalResults.length} products!`;
        } else {
          responseText = `Found ${finalResults.length} products matching "${content}".`;
        }
        
        // Add filtering information if products were filtered
        if (searchResult.totalResultsBeforeFilter && 
            searchResult.totalResultsAfterFilter && 
            searchResult.totalResultsBeforeFilter > searchResult.totalResultsAfterFilter) {
          const filteredCount = searchResult.totalResultsBeforeFilter - searchResult.totalResultsAfterFilter;
          responseText += ` (${filteredCount} products filtered out based on your criteria)`;
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

      // Save chat to database with correct category (only if Electron API is available)
      if (window.electronAPI && window.electronAPI.saveChat) {
        // Detect category from search results
        const category = detectCategoryFromSearchResults(finalResults);
        console.log('[Chat Save] Detected Category:', category, 'from', finalResults.length, 'results');
        
        // Save both user message and the detected category
        await window.electronAPI.saveChat(
          { 
            name: content.substring(0, 50) + '...', 
            category: category 
          },
          userMessage
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      
      let errorText = 'An error occurred while searching for products.';
      
      if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        errorText = 'API authentication failed. Please check if your API keys are properly configured in Settings.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorText = 'Network error occurred. Please check your internet connection and try again.';
      } else if (error.message?.includes('Gemini')) {
        errorText = 'Image analysis failed. Please try again or search without the image.';
      } else if (error.message?.includes('Algolia')) {
        errorText = 'Product search service unavailable. Please try again later.';
      } else {
        errorText = 'An unexpected error occurred. Please try again or check the console for details.';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorText,
        sender: 'assistant',
        timestamp: new Date(),
      };

      addMessageToSession(sessionId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };





  const handleNewSession = () => {
    const newSession = createNewSession();
    setCurrentView('chat');
    // Clear any existing search results for fresh start
    clearSessionSearchResults(newSession.id);
    // Clear sidebar products for new session
    setSidebarProducts([]);
    setIsProductSidebarOpen(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentView('chat');
    // Load search results from the selected session - using sessions state directly
    const selectedSession = sessions.find(s => s.id === sessionId);
    if (selectedSession?.searchResults) {
      setSidebarProducts(selectedSession.searchResults);
      setIsProductSidebarOpen(selectedSession.searchResults.length > 0);
    } else {
      setSidebarProducts([]);
      setIsProductSidebarOpen(false);
    }
  };

  const handleSettingsClick = () => {
    setCurrentView('settings');
  };

  const handleProductSave = async (product: Product) => {
    console.log('handleProductSave called with product:', product);
    
    // Try ML-enabled save first for personalization learning
    if (window.electronAPI?.saveProductWithTracking) {
      try {
        console.log('Calling electronAPI.saveProductWithTracking for ML learning...');
        const result = await window.electronAPI.saveProductWithTracking(product);
        console.log('Save with tracking result:', result);
        
        if (result.success) {
          setSavedProductIds(prev => new Set([...prev, product.id]));
          setSaveMessage({ type: 'success', text: 'Product saved successfully!' });
          console.log('Product saved with ML tracking:', product.id);
          setTimeout(() => setSaveMessage(null), 3000);
          return result;
        }
      } catch (error) {
        console.warn('saveProductWithTracking failed, falling back to regular save:', error);
      }
    }
    
    // Fallback to regular save if ML save is not available or failed
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
        // Special handling for "already saved" case
        if (result.error && result.error.includes('already in your database')) {
          // Product is already saved, so update UI to reflect this
          setSavedProductIds(prev => new Set([...prev, product.id]));
          setSaveMessage({ type: 'success', text: 'Product already saved!' });
          console.log('Product already saved, updating UI:', product.id);
        } else {
          setSaveMessage({ type: 'error', text: result.error || 'Failed to save product' });
        }
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
    
    // Get the latest session data directly from sessions state to avoid stale closure
    const latestSession = sessions.find(s => s.id === currentSessionId);
    if (latestSession?.searchResults && latestSession.searchResults.length > 0) {
      setSidebarProducts(latestSession.searchResults);
      setIsProductSidebarOpen(true);
    }
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

  const handleToggleProductSidebar = () => {
    setIsProductSidebarOpen(prev => !prev);
  };

  const handleClearSidebarProducts = () => {
    setSidebarProducts([]);
    setIsProductSidebarOpen(false);
  };

  // Debug logging
  console.log('[App] Rendering App component:', {
    isDark,
    currentView,
    sessionsCount: sessions.length,
    currentSessionId,
    messagesCount: currentSession?.messages.length || 0,
    isProductSidebarOpen,
    sidebarProductsCount: sidebarProducts.length,
    currentSession: currentSession ? 'exists' : 'null'
  });

  try {
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
        
        <div 
          className="flex flex-col flex-1 transition-all duration-300"
          style={{ 
            marginRight: currentView === 'chat' && isProductSidebarOpen ? `${sidebarWidth}px` : '0px'
          }}
        >
          {currentView === 'chat' ? (
            <>
              <ChatHeader isDark={isDark} />
              <ChatContainer 
                messages={currentSession?.messages || []}
                showTimestamps={settings.showTimestamps}
                isLoading={isLoading}
                isDark={isDark}
                saveMessage={saveMessage}
                imageAnalysisProgress={imageAnalysisProgress}
                searchFeedback={searchFeedback}
                lastSearchResult={lastSearchResult}
                lastSearchQuery={lastSearchQuery}
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
              
              {/* Product Sidebar - Only in chat view */}
              <ProductSidebar
                products={sidebarProducts}
                isOpen={isProductSidebarOpen}
                onToggle={handleToggleProductSidebar}
                onProductSave={handleProductSave}
                onProductRemove={handleProductRemove}
                onClearProducts={handleClearSidebarProducts}
                onWidthChange={setSidebarWidth}
                savedProductIds={savedProductIds}
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
  } catch (error) {
    console.error('[App] Render error:', error);
    console.error('[App] Error stack:', (error as Error).stack);
    // Fallback UI
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Rendering Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            An error occurred while rendering the application.
          </p>
          <pre className="text-sm text-left bg-gray-100 dark:bg-gray-800 p-4 rounded">
            {(error as Error).message}
          </pre>
        </div>
      </div>
    );
  }
}

export default App;