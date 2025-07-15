import React from 'react';
import { Plus, MessageSquare, Settings, Trash2, Search, Database } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onSettingsClick: () => void;
  onDatabaseStatsClick: () => void;
  isDark: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onSettingsClick,
  onDatabaseStatsClick,
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
    <div className={`w-80 h-full border-r flex flex-col ${
      isDark 
        ? 'bg-gray-900 border-gray-700' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewSession}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            isDark
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
              : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm'
          }`}
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
            className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
              isDark
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300'
            } focus:outline-none`}
          />
        </div>
      </div>

      {/* Chat Sessions */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-2">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                currentSessionId === session.id
                  ? isDark
                    ? 'bg-gray-800 border border-gray-600'
                    : 'bg-white border border-gray-200 shadow-sm'
                  : isDark
                    ? 'hover:bg-gray-800'
                    : 'hover:bg-white hover:shadow-sm'
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

      {/* Settings */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onDatabaseStatsClick}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-2 ${
            isDark
              ? 'hover:bg-gray-800 text-gray-300 hover:text-white'
              : 'hover:bg-white hover:shadow-sm text-gray-600 hover:text-gray-900'
          }`}
        >
          <Database className="w-5 h-5" />
          <span className="font-medium">Database Statistics</span>
        </button>
        <button
          onClick={onSettingsClick}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            isDark
              ? 'hover:bg-gray-800 text-gray-300 hover:text-white'
              : 'hover:bg-white hover:shadow-sm text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};