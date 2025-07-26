import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Product search
  searchProducts: (query: string, imageData?: string, discoveryPercentage?: number) => 
    ipcRenderer.invoke('search-products', query, imageData, discoveryPercentage),
  
  // Database operations
  saveProduct: (product: any) => 
    ipcRenderer.invoke('save-product', product),
  
  getProducts: () => 
    ipcRenderer.invoke('get-products'),
  
  removeProduct: (productId: string) => 
    ipcRenderer.invoke('remove-product', productId),
  
  getChatHistory: () => 
    ipcRenderer.invoke('get-chat-history'),
  
  saveChat: (sessionData: any, message: any) => 
    ipcRenderer.invoke('save-chat', sessionData, message),
  
  // Discovery settings
  saveDiscoverySetting: (percentage: 0 | 5 | 10) => 
    ipcRenderer.invoke('save-discovery-setting', percentage),
  
  getDiscoverySetting: () => 
    ipcRenderer.invoke('get-discovery-setting'),

  // App info
  getAppVersion: () => 
    ipcRenderer.invoke('get-app-version'),

  // External links
  openExternal: (url: string) =>
    ipcRenderer.invoke('open-external', url),

  // Update product
  updateProduct: (productId: string, updates: { customName?: string; tags?: string }) =>
    ipcRenderer.invoke('update-product', productId, updates),

  // Database management
  getDatabasePath: () =>
    ipcRenderer.invoke('get-database-path'),
  
  changeDatabasePath: () =>
    ipcRenderer.invoke('change-database-path'),
  
  resetDatabase: () =>
    ipcRenderer.invoke('reset-database'),
  
  resetMLData: () =>
    ipcRenderer.invoke('reset-ml-data'),
  
  // API key management
  getAPIKeys: () =>
    ipcRenderer.invoke('get-api-keys'),
  
  saveAPIKeys: (apiKeys: Record<string, string>) =>
    ipcRenderer.invoke('save-api-keys', apiKeys),
  
  cleanupAPIKeys: (provider?: string) =>
    ipcRenderer.invoke('cleanup-api-keys', provider),
  
  deleteAPIKey: (provider: string) =>
    ipcRenderer.invoke('delete-api-key', provider),
  
  deleteAllAPIKeys: () =>
    ipcRenderer.invoke('delete-all-api-keys'),

  // ML interaction tracking (view tracking removed for MVP)
  trackProductClick: (productId: string, url: string) =>
    ipcRenderer.invoke('track-product-click', productId, url),
  
  saveProductWithTracking: (product: any) =>
    ipcRenderer.invoke('save-product-with-tracking', product),
  
  trackProductRemove: (productId: string) =>
    ipcRenderer.invoke('track-product-remove', productId),
  
  getPersonalizationProfile: () =>
    ipcRenderer.invoke('get-personalization-profile'),
    
  // Debug logging
  debugLog: (message: string, data?: any) =>
    ipcRenderer.invoke('debug-log', message, data),

  // ログ管理
  getLogFilePath: () =>
    ipcRenderer.invoke('get-log-file-path'),
  
  clearLogs: () =>
    ipcRenderer.invoke('clear-logs'),
  
  getLogs: () =>
    ipcRenderer.invoke('get-logs'),
  
  openLogFolder: () =>
    ipcRenderer.invoke('open-log-folder'),
  
  // 一時的なデバッグ用
  debugAPIKeys: () =>
    ipcRenderer.invoke('debug-api-keys'),
  
  deleteCorruptedAPIKeys: () =>
    ipcRenderer.invoke('delete-corrupted-api-keys'),
  
  // Load sample data into Algolia indices
  loadSampleData: () =>
    ipcRenderer.invoke('load-sample-data'),

  // Event listeners for progress tracking
  onImageAnalysisProgress: (callback: (data: { status: string; progress: number }) => void) => {
    ipcRenderer.on('image-analysis-progress', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('image-analysis-progress');
  },

  // Search feedback listener
  onSearchFeedback: (callback: (feedback: string) => void) => {
    ipcRenderer.on('search-feedback', (_, feedback) => callback(feedback));
    return () => ipcRenderer.removeAllListeners('search-feedback');
  },

  // Algolia upload status listener
  onAlgoliaUploadStatus: (callback: (data: { status: string; message: string }) => void) => {
    ipcRenderer.on('algolia-upload-status', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('algolia-upload-status');
  }
})