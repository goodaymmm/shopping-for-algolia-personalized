import React, { useEffect } from 'react'
import { MessageCircle, Calendar, ChevronRight } from 'lucide-react'
import { LoadingSpinner, ErrorBoundary } from '../Common'
import { useDatabaseStore } from '../../store'

export const ChatHistory: React.FC = () => {
  const { chatHistory, isLoading, loadChatHistory } = useDatabaseStore()

  useEffect(() => {
    loadChatHistory()
  }, [loadChatHistory])

  const formatDate = (date: Date) => {
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === date.toDateString()
    
    if (isToday) return 'Today'
    if (isYesterday) return 'Yesterday'
    return date.toLocaleDateString()
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading chat history..." />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Chat History</h2>
              <p className="text-sm text-gray-600">
                {chatHistory.length} conversation{chatHistory.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={loadChatHistory}
              className="px-4 py-2 bg-algolia-500 text-white rounded-lg hover:bg-algolia-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No chat history yet
                </h3>
                <p className="text-gray-600">
                  Start a conversation in the Chat tab to see your history here.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {chatHistory.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          <MessageCircle size={20} className="text-algolia-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {session.name}
                          </h3>
                          {session.category && (
                            <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              {session.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                    
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(session.updatedAt)}</span>
                      </div>
                      <span>{formatTime(session.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}