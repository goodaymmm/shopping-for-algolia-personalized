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
      sender: 'user',
      content,
      image: imageFile ? URL.createObjectURL(imageFile) : undefined,
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
        sender: 'assistant',
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
        sender: 'assistant',
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
      <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
        {/* Header with Discovery Settings - Minimal design */}
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Shopping Assistant
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Find products by description or image
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

          {/* Search Results - Minimal design */}
          {searchResults.length > 0 && (
            <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 p-4">
              <div className="max-w-6xl mx-auto">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  {searchResults.length} results
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 max-h-80 overflow-y-auto scrollbar-thin">
                  {searchResults.slice(0, 24).map((product) => (
                    <div
                      key={product.id}
                      className="group bg-white dark:bg-neutral-800 rounded-md p-3 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        if (window.electronAPI) {
                          window.electronAPI.saveProduct(product)
                        }
                      }}
                    >
                      <div className="aspect-square mb-2 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-900">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        ${product.price}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input Area - Clean design */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <div className="max-w-3xl mx-auto p-4">
              <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}