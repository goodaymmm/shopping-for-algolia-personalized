import React, { useEffect, useRef } from 'react'
import { ChatMessage } from '../../types'
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
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`
                max-w-[85%] rounded-lg px-4 py-2.5
                ${message.role === 'user'
                  ? 'bg-algolia-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100'
                }
              `}
            >
              {message.imageUrl && (
                <div className="mb-2 overflow-hidden rounded-md">
                  <img
                    src={message.imageUrl}
                    alt="Uploaded image"
                    className="max-w-full max-h-48 object-cover"
                  />
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">
                {message.content}
              </p>
              <div
                className={`
                  text-xs mt-1
                  ${message.role === 'user' 
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
  )
}