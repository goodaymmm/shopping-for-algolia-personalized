// UI specific types from the prepared implementation
export interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
  image?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  sendOnEnter: boolean
  showTimestamps: boolean
  autoSave: boolean
  discoveryMode: boolean
}

export type AppView = 'chat' | 'settings' | 'database-stats'