import { useCallback } from 'react'
import { useChatStore, useDatabaseStore } from '../store'
import { ChatMessage } from '../types'

export const useChat = () => {
  const {
    messages,
    isLoading,
    searchResults,
    currentSessionId,
    addMessage,
    setLoading,
    setSearchResults,
    clearMessages,
    setCurrentSession
  } = useChatStore()

  const { saveProduct } = useDatabaseStore()

  const sendMessage = useCallback(async (content: string, imageFile?: File) => {
    if (!content.trim() && !imageFile) return

    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
      timestamp: new Date()
    }

    addMessage(userMessage)
    setLoading(true)

    try {
      // Search for products using Electron API
      const products = await window.electronAPI.searchProducts(content)
      setSearchResults(products)

      // Create assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: products.length > 0 
          ? `Found ${products.length} products for "${content}". Check the results below!`
          : `Sorry, I couldn't find any products matching "${content}". Try a different search term.`,
        timestamp: new Date()
      }

      addMessage(assistantMessage)

      // Save chat to database if we have Electron API
      if (window.electronAPI) {
        const result = await window.electronAPI.saveChat(
          { 
            name: content.substring(0, 50) + (content.length > 50 ? '...' : ''), 
            category: 'search' 
          },
          userMessage
        )

        if (result.success && result.sessionId) {
          setCurrentSession(result.sessionId.toString())
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error searching for products. Please check your connection and try again.',
        timestamp: new Date()
      }

      addMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [addMessage, setLoading, setSearchResults, setCurrentSession])

  const saveProductToDatabase = useCallback(async (product: any) => {
    try {
      await saveProduct(product)
      
      // Add a confirmation message
      const confirmationMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Saved "${product.name}" to your database!`,
        timestamp: new Date()
      }
      
      addMessage(confirmationMessage)
    } catch (error) {
      console.error('Failed to save product:', error)
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Failed to save "${product.name}". Please try again.`,
        timestamp: new Date()
      }
      
      addMessage(errorMessage)
    }
  }, [saveProduct, addMessage])

  const startNewChat = useCallback(() => {
    clearMessages()
  }, [clearMessages])

  return {
    // State
    messages,
    isLoading,
    searchResults,
    currentSessionId,
    
    // Actions
    sendMessage,
    saveProductToDatabase,
    startNewChat,
    clearMessages
  }
}