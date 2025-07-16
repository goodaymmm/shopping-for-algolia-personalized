import React from 'react';
import { MessageSquare, Minimize2, Square, X } from 'lucide-react';

interface ChatHeaderProps {
  isDark: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ isDark }) => {

  return (
    <div className={`border-b select-none ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Window Controls Bar */}
      <div className={`flex items-center justify-between px-4 py-2 ${
        isDark ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className={`text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Shopping AI
          </span>
        </div>
        
        {/* Window Controls */}
        <div className="flex items-center gap-1">
          <button className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            isDark 
              ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
              : 'hover:bg-gray-200 text-gray-600'
          }`}>
            <Minimize2 className="w-4 h-4" />
          </button>
          <button className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            isDark 
              ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
              : 'hover:bg-gray-200 text-gray-600'
          }`}>
            <Square className="w-3 h-3" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
    </div>
  );
};