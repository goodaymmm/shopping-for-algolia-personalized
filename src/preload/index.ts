import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, Product, ChatMessage, ChatSession, DiscoveryPercentage } from '../shared/types'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => process.env.npm_package_version || '1.0.0',
  
  // Database operations
  saveProduct: (product: Product) => ipcRenderer.invoke(IPC_CHANNELS.DB_SAVE_PRODUCT, product),
  getProducts: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PRODUCTS),
  saveChat: (sessionData: { name: string; category?: string }, message: ChatMessage) => 
    ipcRenderer.invoke(IPC_CHANNELS.DB_SAVE_CHAT, sessionData, message),
  getChatHistory: (): Promise<ChatSession[]> => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_CHAT_HISTORY),
  getChatMessages: (sessionId: number) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_CHAT_MESSAGES, sessionId),
  
  // Settings
  saveDiscoverySetting: (percentage: DiscoveryPercentage) => 
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE_DISCOVERY, percentage),
  getDiscoverySetting: (): Promise<DiscoveryPercentage> => 
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_DISCOVERY),
  
  // Search
  searchProducts: (query: string, filters?: string): Promise<Product[]> => 
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_PRODUCTS, query, filters),
})