import { create } from 'zustand'
import { Product, ChatSession } from '../types'

interface DatabaseState {
  savedProducts: Product[]
  chatHistory: ChatSession[]
  isLoading: boolean
  
  // Actions
  loadProducts: () => Promise<void>
  saveProduct: (product: Product) => Promise<void>
  removeProduct: (productId: string) => Promise<void>
  loadChatHistory: () => Promise<void>
  addToHistory: (session: ChatSession) => void
}

export const useDatabaseStore = create<DatabaseState>((set) => ({
  savedProducts: [],
  chatHistory: [],
  isLoading: false,

  loadProducts: async () => {
    if (!window.electronAPI) return
    
    set({ isLoading: true })
    try {
      const products = await window.electronAPI.getProducts()
      set({ savedProducts: products })
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  saveProduct: async (product) => {
    if (!window.electronAPI) return
    
    try {
      const result = await window.electronAPI.saveProduct(product)
      if (result.success) {
        set((state) => ({
          savedProducts: [...state.savedProducts.filter(p => p.id !== product.id), product]
        }))
      }
    } catch (error) {
      console.error('Failed to save product:', error)
    }
  },

  removeProduct: async (productId) => {
    // Note: We'd need to implement a remove method in the database service
    // For now, just remove from local state
    set((state) => ({
      savedProducts: state.savedProducts.filter(p => p.id !== productId)
    }))
  },

  loadChatHistory: async () => {
    if (!window.electronAPI) return
    
    try {
      const history = await window.electronAPI.getChatHistory()
      set({ chatHistory: history })
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  },

  addToHistory: (session) => {
    set((state) => ({
      chatHistory: [session, ...state.chatHistory.filter(s => s.id !== session.id)]
    }))
  }
}))