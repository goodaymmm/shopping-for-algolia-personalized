// Global types shared between main and renderer processes

export interface ElectronAPI {
  getAppVersion: () => string
  
  // Database operations
  saveProduct: (product: Product) => Promise<{ success: boolean; id?: number }>
  getProducts: () => Promise<Product[]>
  removeProduct: (productId: string) => Promise<{ success: boolean }>
  updateProduct: (productId: string, updates: { customName?: string; tags?: string }) => Promise<{ success: boolean }>
  getChatHistory: () => Promise<ChatSession[]>
  saveChat: (sessionData: { name: string; category?: string }, message: Message) => Promise<{ success: boolean; sessionId?: number }>
  
  // Settings
  saveDiscoverySetting: (percentage: DiscoveryPercentage) => Promise<{ success: boolean }>
  getDiscoverySetting: () => Promise<DiscoveryPercentage>
  
  // Search
  searchProducts: (query: string, imageData?: string) => Promise<Product[]>
  
  // External links
  openExternal: (url: string) => Promise<void>
  
  // Database management
  getDatabasePath: () => Promise<{ success: boolean; path?: string }>
  changeDatabasePath: () => Promise<{ success: boolean }>
  resetDatabase: () => Promise<{ success: boolean }>
  resetMLData: () => Promise<{ success: boolean }>
  
  // API key management
  getAPIKeys: () => Promise<{ success: boolean; keys?: Record<string, string> }>
  saveAPIKeys: (apiKeys: Record<string, string>) => Promise<{ success: boolean }>
  cleanupAPIKeys: (provider?: string) => Promise<{ success: boolean; message?: string }>
  
  // ML interaction tracking
  trackProductView: (productId: string, timeSpent: number) => Promise<{ success: boolean }>
  trackProductClick: (productId: string, url: string) => Promise<{ success: boolean }>
  saveProductWithTracking: (product: Product) => Promise<{ success: boolean; id?: number }>
  trackProductRemove: (productId: string) => Promise<{ success: boolean }>
  getPersonalizationProfile: () => Promise<{ success: boolean; profile?: any }>
  
  // ログ管理
  getLogFilePath: () => Promise<{ success: boolean; path?: string }>
  clearLogs: () => Promise<{ success: boolean; message?: string }>
  getLogs: () => Promise<{ success: boolean; logs?: string }>
  
  // 一時的なデバッグ用
  debugAPIKeys: () => Promise<{ success: boolean; debugInfo?: any }>
  deleteCorruptedAPIKeys: () => Promise<{ success: boolean; message?: string; deletedCount?: number }>
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
  sourceIndex?: string // 検索元インデックス（統合検索用）
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
  searchResults?: (Product | ProductWithContext)[]
  createdAt: Date
  updatedAt: Date
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
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

// Progress status for image analysis
export type ImageAnalysisProgressStatus = 
  | 'preparing'
  | 'uploading'
  | 'analyzing'
  | 'detailed-analysis'
  | 'completed'
  | 'failed'
  | 'timeout'

export interface ImageAnalysisProgress {
  status: ImageAnalysisProgressStatus
  message: string
  progress: number // 0-100
}