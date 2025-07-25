import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Search, Trash2, Calendar, Filter, ShoppingBag, Edit2, Check, X } from 'lucide-react';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');

  // Filter sessions based on search and category
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = searchQuery === '' || 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || session.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(sessions.map(s => s.category).filter(Boolean)))];

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

  const handleEditCategory = (sessionId: string, currentCategory: string) => {
    setEditingSessionId(sessionId);
    setEditingCategory(currentCategory || 'general');
  };

  const handleSaveCategory = async (sessionId: string) => {
    if (!window.electronAPI.updateChatCategory) return;
    
    try {
      const result = await window.electronAPI.updateChatCategory(sessionId, editingCategory);
      if (result.success) {
        // Update local state by refreshing chat history
        const updatedSessions = await window.electronAPI.getChatHistory();
        // Parent component should handle updating sessions
        window.location.reload(); // Simple refresh for now
      } else {
        console.error('Failed to update category:', result.error);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setEditingSessionId(null);
      setEditingCategory('');
    }
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingCategory('');
  };

  const availableCategories = ['general', 'fashion', 'electronics', 'home', 'sports', 'beauty', 'books', 'food', 'products'];

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

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
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
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`pl-3 pr-8 py-2 rounded-lg border transition-colors appearance-none ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
              } focus:outline-none`}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : 
                   category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            <Filter size={16} className={`absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredSessions.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No conversations found</p>
            <p className="text-sm">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria'
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{session.title}</h3>
                      {session.category && (
                        editingSessionId === session.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={editingCategory}
                              onChange={(e) => setEditingCategory(e.target.value)}
                              className={`px-2 py-1 text-xs rounded-lg border ${
                                isDark 
                                  ? 'bg-gray-700 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              } focus:outline-none`}
                              autoFocus
                            >
                              {availableCategories.map(cat => (
                                <option key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleSaveCategory(session.id)}
                              className={`p-1 rounded ${
                                isDark ? 'hover:bg-gray-600 text-green-400' : 'hover:bg-gray-200 text-green-600'
                              }`}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className={`p-1 rounded ${
                                isDark ? 'hover:bg-gray-600 text-red-400' : 'hover:bg-gray-200 text-red-600'
                              }`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              isDark 
                                ? 'bg-purple-900 text-purple-200' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {session.category}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCategory(session.id, session.category || 'general');
                              }}
                              className={`p-1 rounded transition-all opacity-40 hover:opacity-100 ${
                                isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                              }`}
                              title="Edit category"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )
                      )}
                    </div>
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