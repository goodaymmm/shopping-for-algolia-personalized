// Global types shared between main and renderer processes

export interface ElectronAPI {
  getAppVersion: () => string
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

// Chat types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  timestamp: Date
}

export interface ChatSession {
  id: string
  name: string
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