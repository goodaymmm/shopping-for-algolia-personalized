import React, { useEffect, useRef } from 'react'
import { ChatMessage } from '../../types'
import { LoadingSpinner } from '../Common'

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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛍️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Start your shopping journey
          </h3>
          <p className="text-gray-600 max-w-md">
            Upload an image of something you like or describe what you're looking for.
            I'll help you find similar products using AI-powered search.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[70%] rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'bg-algolia-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {message.imageUrl && (
              <div className="mb-2">
                <img
                  src={message.imageUrl}
                  alt="Uploaded image"
                  className="max-w-48 max-h-48 rounded-lg border"
                />
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <div
              className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-algolia-100' : 'text-gray-500'
              }`}
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
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-lg px-4 py-2">
            <LoadingSpinner size="sm" text="Searching for products..." />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}