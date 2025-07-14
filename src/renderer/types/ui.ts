// Re-export shared types for UI consistency
export type { ChatMessage, ChatSession, Product } from '../../shared/types'

// UI specific settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  sendOnEnter: boolean
  showTimestamps: boolean
  autoSave: boolean
  discoveryMode: boolean
}

export type AppView = 'chat' | 'settings' | 'database-stats'