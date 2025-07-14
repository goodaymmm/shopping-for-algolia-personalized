// Re-export shared types
export * from '../../shared/types'

// Renderer-specific types
export interface ImageFile {
  file: File
  preview: string
}

export interface SearchResult {
  products: Product[]
  query: string
  timestamp: Date
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  currentSession?: string
}

// Import the shared types we need
import { Product, ChatMessage } from '../../shared/types'