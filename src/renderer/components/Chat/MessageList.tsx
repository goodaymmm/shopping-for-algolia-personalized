import React, { useEffect, useRef } from 'react'
import { ChatMessage } from '../../types'
import { LoadingSpinner } from '../Common'
import { ShoppingBag } from 'lucide-react'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-algolia-400 to-algolia-600 rounded-3xl flex items-center justify-center shadow-xl shadow-algolia-500/20">
            <ShoppingBag className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
            Start your shopping journey
          </h3>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Upload an image of something you like or describe what you're looking for.
            I'll help you find similar products using AI-powered search.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={`
                max-w-[80%] rounded-2xl px-5 py-3 
                ${message.role === 'user'
                  ? 'bg-gradient-to-br from-algolia-500 to-algolia-600 text-white shadow-lg shadow-algolia-500/20'
                  : 'bg-gray-100 dark:bg-dark-800 text-gray-900 dark:text-white border border-gray-200 dark:border-dark-700'
                }
              `}
            >
              {message.imageUrl && (
                <div className="mb-3 overflow-hidden rounded-xl">
                  <img
                    src={message.imageUrl}
                    alt="Uploaded image"
                    className="max-w-xs max-h-64 object-cover"
                  />
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              <div
                className={`
                  text-xs mt-2 flex items-center gap-1
                  ${message.role === 'user' 
                    ? 'text-algolia-200' 
                    : 'text-gray-500 dark:text-gray-500'
                  }
                `}
              >
                <span className="w-1 h-1 bg-current rounded-full opacity-50"></span>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-gray-100 dark:bg-dark-800 rounded-2xl px-5 py-4 border border-gray-200 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-algolia-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-algolia-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-algolia-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Searching for products...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}