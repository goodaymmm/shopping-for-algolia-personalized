import React, { useState, useEffect } from 'react'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { DiscoverySettings } from './DiscoverySettings'
import { ErrorBoundary } from '../Common'
import { ChatMessage, DiscoveryPercentage, Product } from '../../types'

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [discoveryPercentage, setDiscoveryPercentage] = useState<DiscoveryPercentage>(0)
  const [searchResults, setSearchResults] = useState<Product[]>([])

  // Load discovery setting on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getDiscoverySetting().then(setDiscoveryPercentage)
    }
  }, [])

  const handleDiscoveryChange = async (value: DiscoveryPercentage) => {
    setDiscoveryPercentage(value)
    if (window.electronAPI) {
      await window.electronAPI.saveDiscoverySetting(value)
    }
  }

  const handleSendMessage = async (content: string, imageFile?: File) => {
    if (!content.trim() && !imageFile) return

    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Search for products using Algolia
      const products = await window.electronAPI.searchProducts(content)
      setSearchResults(products)

      // Create assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Found ${products.length} products for "${content}"`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Save chat to database
      if (window.electronAPI) {
        await window.electronAPI.saveChat(
          { 
            name: content.substring(0, 50) + '...', 
            category: 'search' 
          },
          userMessage
        )
      }
    } catch (error) {
      console.error('Search error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error searching for products. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-white dark:bg-dark-900">
        {/* Header with Discovery Settings */}
        <header className="border-b border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI Shopping Assistant
                </h2>
                <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                  Upload an image or describe what you're looking for
                </p>
              </div>
              <DiscoverySettings
                value={discoveryPercentage}
                onChange={handleDiscoveryChange}
              />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Container */}
          <div className="flex-1 overflow-hidden">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border-t border-gray-200 dark:border-dark-800 bg-gray-50 dark:bg-dark-850 p-4">
              <div className="max-w-5xl mx-auto">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-algolia-500 rounded-full animate-pulse"></span>
                  Found {searchResults.length} products
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 max-h-64 overflow-y-auto scrollbar-thin">
                  {searchResults.slice(0, 18).map((product) => (
                    <div
                      key={product.id}
                      className="group bg-white dark:bg-dark-800 rounded-xl p-3 shadow-soft dark:shadow-dark-soft hover:shadow-medium dark:hover:shadow-dark-medium transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                      onClick={() => {
                        if (window.electronAPI) {
                          window.electronAPI.saveProduct(product)
                        }
                      }}
                    >
                      <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-dark-700">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <p className="text-sm font-bold text-algolia-600 dark:text-algolia-400">
                        ${product.price}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900">
            <div className="max-w-4xl mx-auto p-4">
              <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}