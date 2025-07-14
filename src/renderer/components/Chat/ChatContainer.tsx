import React, { useEffect, useRef } from 'react'
import { ShoppingBag } from 'lucide-react'
import { Message } from '../../types/ui'
import { Product } from '../../types'

interface ChatContainerProps {
  messages: Message[]
  searchResults?: Product[]
  showTimestamps: boolean
  fontSize: 'small' | 'medium' | 'large'
  isLoading?: boolean
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  searchResults = [],
  showTimestamps,
  fontSize,
  isLoading = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-sm'
      case 'large': return 'text-base'
      default: return 'text-sm'
    }
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-neutral-900">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-850 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-algolia-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Start your shopping journey
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Upload an image or describe what you're looking for, and I'll help you find similar products.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`
                  max-w-[85%] rounded-lg px-4 py-2.5 ${getFontSizeClass()}
                  ${message.sender === 'user'
                    ? 'bg-algolia-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100'
                  }
                `}
              >
                {message.image && (
                  <div className="mb-2 overflow-hidden rounded-md">
                    <img
                      src={message.image}
                      alt="Uploaded image"
                      className="max-w-full max-h-48 object-cover"
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap">
                  {message.content}
                </p>
                {showTimestamps && (
                  <div
                    className={`
                      text-xs mt-1
                      ${message.sender === 'user' 
                        ? 'text-algolia-200' 
                        : 'text-neutral-500 dark:text-neutral-400'
                      }
                    `}
                  >
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-neutral-100 dark:bg-neutral-850 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-algolia-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-algolia-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-algolia-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Searching...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Search Results */}
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
    </div>
  )
}