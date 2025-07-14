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
      <div className="h-full flex flex-col">
        {/* Header with Discovery Settings */}
        <div className="border-b border-gray-200 p-4">
          <div className="mb-3">
            <h2 className="text-xl font-semibold text-gray-900">AI Shopping Assistant</h2>
            <p className="text-sm text-gray-600">Upload an image or describe what you're looking for</p>
          </div>
          
          <DiscoverySettings
            value={discoveryPercentage}
            onChange={handleDiscoveryChange}
          />
        </div>

        {/* Messages */}
        <MessageList messages={messages} isLoading={isLoading} />

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Found {searchResults.length} products
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
              {searchResults.slice(0, 12).map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (window.electronAPI) {
                      window.electronAPI.saveProduct(product)
                    }
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-20 object-cover rounded mb-2"
                  />
                  <p className="text-xs font-medium text-gray-900 line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-xs text-algolia-600 font-semibold">
                    ${product.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </ErrorBoundary>
  )
}