import React from 'react';
import { Plus, MessageSquare, Settings, Trash2, Search, Database, History, Package } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onSettingsClick: () => void;
  onHistoryClick?: () => void;
  onDatabaseClick?: () => void;
  isDark: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onSettingsClick,
  onHistoryClick,
  onDatabaseClick,
  isDark
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-80 h-full border-r flex flex-col bg-gray-50 dark:bg-slate-900/95 border-gray-200 dark:border-slate-700/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className={`relative ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border transition-colors duration-200 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Chat Sessions */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-2">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                currentSessionId === session.id
                  ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-600/50'
                  : 'hover:bg-slate-800/30 hover:backdrop-blur-sm'
              }`}
              onClick={() => onSessionSelect(session.id)}
            >
              <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm truncate ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {session.title}
                </div>
                <div className={`text-xs ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {formatDate(session.updatedAt)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                  isDark
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {onHistoryClick && (
          <button
            onClick={onHistoryClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 mb-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/50"
          >
            <History className="w-5 h-5" />
            <span className="font-medium">Chat History</span>
          </button>
        )}
        
        {onDatabaseClick && (
          <button
            onClick={onDatabaseClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 mb-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/50"
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">My Database</span>
          </button>
        )}
        
        
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/50"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};