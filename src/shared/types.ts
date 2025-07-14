// Global types shared between main and renderer processes

export interface ElectronAPI {
  getAppVersion: () => string
  
  // Database operations
  saveProduct: (product: Product) => Promise<{ success: boolean; id?: number }>
  getProducts: () => Promise<Product[]>
  saveChat: (sessionData: { name: string; category?: string }, message: ChatMessage) => Promise<{ success: boolean; sessionId?: number }>
  getChatHistory: () => Promise<ChatSession[]>
  getChatMessages: (sessionId: number) => Promise<ChatMessage[]>
  
  // Settings
  saveDiscoverySetting: (percentage: DiscoveryPercentage) => Promise<{ success: boolean }>
  getDiscoverySetting: () => Promise<DiscoveryPercentage>
  
  // Search
  searchProducts: (query: string, imageData?: string) => Promise<Product[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// IPC channel names
export const IPC_CHANNELS = {
  DB_SAVE_PRODUCT: 'db:save-product',
  DB_GET_PRODUCTS: 'db:get-products', 
  DB_SAVE_CHAT: 'db:save-chat',
  DB_GET_CHAT_HISTORY: 'db:get-chat-history',
  DB_GET_CHAT_MESSAGES: 'db:get-chat-messages',
  SETTINGS_SAVE_DISCOVERY: 'settings:save-discovery',
  SETTINGS_GET_DISCOVERY: 'settings:get-discovery',
  SEARCH_PRODUCTS: 'search:products'
} as const

// Product types
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  image: string
  categories?: string[]
  url?: string
}

// Chat types (unified with UI Message interface)
export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'  // Changed from 'role' to 'sender' for UI consistency
  content: string
  image?: string  // Changed from 'imageUrl' to 'image' for UI consistency
  timestamp: Date
}

export interface ChatSession {
  id: string
  title: string  // Changed from 'name' to 'title' for UI consistency
  category?: string
  subcategory?: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

// Discovery settings
export type DiscoveryPercentage = 0 | 5 | 10

export interface DiscoverySettings {
  outlierPercentage: DiscoveryPercentage
}

// Product display types
export type ProductDisplayType = 'personalized' | 'inspiration'

export interface ProductWithContext {
  product: Product
  displayType: ProductDisplayType
  inspirationReason?: 'trending' | 'different_style' | 'visual_appeal'
}