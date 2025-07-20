import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { Message, ImageAnalysisProgress } from '../types';
import { Sparkles, Clock, Loader } from 'lucide-react';

interface ChatContainerProps {
  messages: Message[];
  showTimestamps: boolean;
  isLoading?: boolean;
  isDark: boolean;
  saveMessage?: { type: 'success' | 'error'; text: string } | null;
  imageAnalysisProgress?: ImageAnalysisProgress | null;
  searchFeedback?: string | null;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  messages, 
  showTimestamps, 
  isLoading = false,
  isDark,
  saveMessage,
  imageAnalysisProgress,
  searchFeedback
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-16">
            <div className="max-w-md">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                Welcome to Shopping AI
              </h2>
              <p className="leading-relaxed mb-6 text-gray-600 dark:text-gray-300">
                I'm Shopping AI, powered by Algolia Search. I can help you find products, compare prices, discover deals, and make informed shopping decisions.
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 backdrop-blur-sm">
                  <div className="font-medium mb-1 text-gray-900 dark:text-white">
                    💬 Natural conversation
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Ask me anything or start a conversation
                  </div>
                </div>
                <div className="rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 backdrop-blur-sm">
                  <div className="font-medium mb-1 text-gray-900 dark:text-white">
                    🖼️ Image analysis
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Upload images for analysis and discussion
                  </div>
                </div>
                <div className="rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 backdrop-blur-sm">
                  <div className="font-medium mb-1 text-gray-900 dark:text-white">
                    📝 Writing assistance
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
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
                isDark={isDark}
              />
            ))}
            
            {/* Save Message Notification */}
            {saveMessage && (
              <div className="px-6 my-4">
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  saveMessage.type === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}>
                  {saveMessage.type === 'success' ? '✓' : '✗'}
                  <span className="font-medium">{saveMessage.text}</span>
                </div>
              </div>
            )}
            
            {/* Search Feedback */}
            {searchFeedback && (
              <div className="px-6 my-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Loader className="w-5 h-5 text-yellow-500 animate-spin" />
                    </div>
                    <div className="text-sm text-yellow-900 dark:text-yellow-100">
                      {searchFeedback}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Image Analysis Progress */}
            {imageAnalysisProgress && (
              <div className="px-6 my-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Image Analysis in Progress
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        {imageAnalysisProgress.message}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {imageAnalysisProgress.progress}%
                    </div>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${imageAnalysisProgress.progress}%` }}
                    />
                  </div>
                  {imageAnalysisProgress.progress > 50 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <Clock className="w-3 h-3" />
                      <span>This may take up to 60 seconds...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && !imageAnalysisProgress && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Searching for products...</span>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};