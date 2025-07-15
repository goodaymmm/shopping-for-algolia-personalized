// Global types shared between main and renderer processes

export interface ElectronAPI {
  getAppVersion: () => string
  
  // Database operations
  saveProduct: (product: Product) => Promise<{ success: boolean; id?: number }>
  getChatHistory: () => Promise<ChatSession[]>
  saveChat: (sessionData: { name: string; category?: string }, message: Message) => Promise<{ success: boolean; sessionId?: number }>
  
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

// Chat types (following project base structure)
export interface Message {
  id: string
  sender: 'user' | 'assistant'
  content: string
  image?: string
  timestamp: Date
}

export interface ChatSession {
  id: string
  title: string
  category?: string
  subcategory?: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  sendOnEnter: boolean
  showTimestamps: boolean
  autoSave: boolean
  discoveryMode: boolean
}

export type AppView = 'chat' | 'settings' | 'database-stats' | 'history' | 'database'

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