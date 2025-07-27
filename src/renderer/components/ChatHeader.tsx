import React from 'react';
import { MessageSquare } from 'lucide-react';

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
      {/* Header Bar with draggable area */}
      <div className={`flex items-center justify-between px-4 py-2 ${
        isDark ? 'bg-gray-900' : 'bg-gray-100'
      }`} style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className={`text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Shopping AI
          </span>
        </div>
      </div>
      
    </div>
  );
};