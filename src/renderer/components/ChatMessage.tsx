import React from 'react';
import { User, Bot } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  showTimestamp: boolean;
  fontSize: 'small' | 'medium' | 'large';
  isDark: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  showTimestamp, 
  fontSize,
  isDark 
}) => {
  const isUser = message.sender === 'user';
  
  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div className={`max-w-2xl ${isUser ? 'order-1' : 'order-2'}`}>
        <div className={`rounded-2xl px-5 py-4 shadow-md transition-all hover:shadow-lg ${fontSizeClasses[fontSize]} ${
          isUser 
            ? 'bg-blue-500 text-white ml-auto' 
            : isDark
              ? 'bg-gray-800 text-gray-100 border border-gray-700'
              : 'bg-gray-50 text-gray-900 border border-gray-100'
        }`}>
          {message.image && (
            <div className="mb-4 relative">
              <div className="max-w-sm mx-auto">
                <img 
                  src={message.image} 
                  alt="Uploaded content" 
                  className="rounded-xl w-full h-auto max-h-64 object-contain bg-gray-100 dark:bg-gray-800 cursor-pointer"
                />
              </div>
            </div>
          )}
          <div className={`leading-relaxed whitespace-pre-wrap ${fontSizeClasses[fontSize]}`}>
            {message.content}
          </div>
        </div>
        {showTimestamp && (
          <div className={`text-xs mt-2 px-1 ${
            isUser ? 'text-right' : 'text-left'
          } ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center order-2 shadow-md">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};