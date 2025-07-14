import React, { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatMessage as Message } from '../../types'
import { Product } from '../../types'
import { MessageSquare, Sparkles } from 'lucide-react'

interface ChatContainerProps {
  messages: Message[]
  searchResults?: Product[]
  showTimestamps: boolean
  fontSize: 'small' | 'medium' | 'large'
  isLoading?: boolean
  isDark: boolean
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  messages, 
  searchResults = [],
  showTimestamps, 
  fontSize,
  isLoading = false,
  isDark 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  }

  return (
    <div className={`flex-1 overflow-y-auto ${
      isDark ? 'bg-gray-900' : 'bg-white'
    }`}>
      <div className="max-w-4xl mx-auto px-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-16">
            <div className="max-w-md">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm ${
                isDark 
                  ? 'bg-gradient-to-br from-orange-800 to-orange-900' 
                  : 'bg-gradient-to-br from-orange-100 to-orange-200'
              }`}>
                <Sparkles className={`w-10 h-10 ${
                  isDark ? 'text-orange-400' : 'text-orange-500'
                }`} />
              </div>
              <h2 className={`text-2xl font-semibold mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Welcome to Shopping AI
              </h2>
              <p className={`leading-relaxed mb-6 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                I'm Shopping AI, powered by Algolia Search. I can help you find products, compare prices, discover deals, and make informed shopping decisions.
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className={`rounded-lg p-3 text-left ${
                  isDark ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <div className={`font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    💬 Natural conversation
                  </div>
                  <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Ask me anything or start a conversation
                  </div>
                </div>
                <div className={`rounded-lg p-3 text-left ${
                  isDark ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <div className={`font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    🖼️ Image analysis
                  </div>
                  <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Upload images for analysis and discussion
                  </div>
                </div>
                <div className={`rounded-lg p-3 text-left ${
                  isDark ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <div className={`font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    📝 Writing assistance
                  </div>
                  <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Help with writing, editing, and creative projects
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                showTimestamp={showTimestamps}
                fontSize={fontSize}
                isDark={isDark}
              />
            ))}
            
            {isLoading && (
              <div className="flex gap-4 mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className={`${fontSizeClasses[fontSize]} rounded-2xl px-5 py-4 ${
                  isDark 
                    ? 'bg-gray-800 text-gray-100 border border-gray-700'
                    : 'bg-gray-50 text-gray-900 border border-gray-100'
                } shadow-sm`}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      Searching for products...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className={`border-t ${
          isDark ? 'border-gray-700 bg-gray-850' : 'border-gray-200 bg-gray-50'
        } p-6`}>
          <div className="max-w-6xl mx-auto">
            <h3 className={`text-sm font-medium mb-4 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {searchResults.length} products found
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {searchResults.slice(0, 24).map((product) => (
                <div
                  key={product.id}
                  className={`group rounded-xl p-4 border transition-all duration-200 cursor-pointer ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                  onClick={() => {
                    if (window.electronAPI) {
                      window.electronAPI.saveProduct(product)
                    }
                  }}
                >
                  <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <p className={`text-sm line-clamp-2 mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {product.name}
                  </p>
                  <p className={`text-lg font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    ${product.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}