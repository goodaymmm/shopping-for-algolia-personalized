import { create } from 'zustand'
import { ChatMessage, Product } from '../types'

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  searchResults: Product[]
  currentSessionId?: string
  
  // Actions
  addMessage: (message: ChatMessage) => void
  setLoading: (loading: boolean) => void
  setSearchResults: (results: Product[]) => void
  clearMessages: () => void
  setCurrentSession: (sessionId?: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  searchResults: [],
  currentSessionId: undefined,

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  setSearchResults: (results) => {
    set({ searchResults: results })
  },

  clearMessages: () => {
    set({ 
      messages: [],
      searchResults: [],
      currentSessionId: undefined
    })
  },

  setCurrentSession: (sessionId) => {
    set({ currentSessionId: sessionId })
  }
}))