import { useState, useEffect } from 'react';
import { ChatSession, Message, Product, ProductWithContext } from '../types';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';

export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = safeGetItem<any[]>('chat-sessions', []);
    try {
      return saved.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: (session.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        searchResults: session.searchResults || []
      }));
    } catch (error) {
      console.error('Failed to parse chat sessions:', error);
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return safeGetItem<string | null>('current-session-id', null);
  });

  useEffect(() => {
    safeSetItem('chat-sessions', sessions);
  }, [sessions]);

  useEffect(() => {
    if (currentSessionId) {
      safeSetItem('current-session-id', currentSessionId);
    } else {
      safeRemoveItem('current-session-id');
    }
  }, [currentSessionId]);

  const createNewSession = (category?: string) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      category: category || 'pending', // Use 'pending' instead of 'general' initially
      messages: [],
      searchResults: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession;
  };

  const updateSession = (sessionId: string, updates: Partial<ChatSession>) => {
    // Debug log the update
    if (window.electronAPI?.debugLog) {
      window.electronAPI.debugLog('updateSession called', {
        sessionId,
        updates,
        hasCategory: 'category' in updates
      });
    }
    
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, ...updates, updatedAt: new Date() }
        : session
    ));
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const addMessageToSession = (sessionId: string, message: Message) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        const updatedMessages = [...session.messages, message];
        let title = session.title;
        
        // Auto-generate title from first user message
        if (session.messages.length === 0 && message.sender === 'user') {
          title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        }
        
        return {
          ...session,
          messages: updatedMessages,
          title,
          updatedAt: new Date(),
        };
      }
      return session;
    }));
  };

  const updateSessionSearchResults = (sessionId: string, searchResults: (Product | ProductWithContext)[]) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { 
            ...session, 
            searchResults,
            updatedAt: new Date() 
          }
        : session
    ));
  };

  const appendSessionSearchResults = (sessionId: string, newResults: (Product | ProductWithContext)[]) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        // 既存の商品IDを収集（重複防止）
        const existingIds = new Set(
          (session.searchResults || []).map(r => 
            'product' in r ? r.product.id : r.id
          )
        );
        
        // 新しい結果から重複を除外
        const uniqueNewResults = newResults.filter(r => {
          const id = 'product' in r ? r.product.id : r.id;
          return !existingIds.has(id);
        });
        
        return {
          ...session,
          searchResults: [...(session.searchResults || []), ...uniqueNewResults],
          updatedAt: new Date()
        };
      }
      return session;
    }));
  };

  const clearSessionSearchResults = (sessionId: string) => {
    updateSessionSearchResults(sessionId, []);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  return {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    updateSession,
    deleteSession,
    addMessageToSession,
    updateSessionSearchResults,
    appendSessionSearchResults,
    clearSessionSearchResults,
  };
};