import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { Message } from '../types';
import { MessageSquare, Sparkles } from 'lucide-react';

interface ChatContainerProps {
  messages: Message[];
  showTimestamps: boolean;
  fontSize: 'small' | 'medium' | 'large';
  isDark: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  messages, 
  showTimestamps, 
  fontSize,
  isDark 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

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
                fontSize={fontSize}
                isDark={isDark}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};