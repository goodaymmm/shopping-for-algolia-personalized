import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Search, Trash2, Calendar, ShoppingBag } from 'lucide-react';
import { ChatSession } from '../types';

interface ChatHistoryProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onBack: () => void;
  isDark: boolean;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  onSessionSelect,
  onSessionDelete,
  onBack,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = searchQuery === '' || 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getLastMessage = (session: ChatSession) => {
    const lastMessage = session.messages[session.messages.length - 1];
    if (!lastMessage) return 'No messages';
    
    return lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + '...'
      : lastMessage.content;
  };

  const getProductCount = (session: ChatSession) => {
    return session.searchResults?.length || 0;
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`border-b p-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold">Chat History</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare size={16} />
            <span>{filteredSessions.length} sessions</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
            } focus:outline-none`}
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredSessions.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No conversations found</p>
            <p className="text-sm">
              {searchQuery
                ? 'Try adjusting your search criteria'
                : 'Start a new conversation to see it here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`rounded-lg border p-4 transition-all cursor-pointer group ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600' 
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate mb-1">{session.title}</h3>
                    <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getLastMessage(session)}
                    </p>
                    <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{formatDate(session.updatedAt)}</span>
                      </div>
                      <span>{session.messages.length} messages</span>
                      {getProductCount(session) > 0 && (
                        <div className="flex items-center gap-1">
                          <ShoppingBag size={12} />
                          <span>{getProductCount(session)} products</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSessionDelete(session.id);
                    }}
                    className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                      isDark 
                        ? 'hover:bg-red-900 text-gray-400 hover:text-red-300' 
                        : 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                    }`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};