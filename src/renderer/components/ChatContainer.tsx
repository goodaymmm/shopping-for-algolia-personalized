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
    <div className={`flex-1 overflow-y-auto ${
      isDark ? 'bg-gray-900' : 'bg-white'
    }`}>
      <div className="max-w-4xl mx-auto px-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-16">
            <div className="max-w-md">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${
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
                <div className={`rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all ${
                  isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-100'
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
                <div className={`rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all ${
                  isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-100'
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
                <div className={`rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all ${
                  isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-100'
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
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};