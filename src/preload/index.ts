import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Product search
  searchProducts: (query: string, imageData?: string) => 
    ipcRenderer.invoke('search-products', query, imageData),
  
  // Database operations
  saveProduct: (product: any) => 
    ipcRenderer.invoke('save-product', product),
  
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
    ipcRenderer.invoke('get-app-version')
})