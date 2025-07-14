import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChatSession, Message } from '../types/ui'

interface ChatSessionsState {
  sessions: ChatSession[]
  currentSessionId: string | null
  currentSession: ChatSession | null
  createNewSession: () => ChatSession
  deleteSession: (id: string) => void
  setCurrentSessionId: (id: string) => void
  addMessageToSession: (sessionId: string, message: Message) => void
  updateSessionTitle: (sessionId: string, title: string) => void
}

const generateTitle = (messages: Message[]): string => {
  const firstUserMessage = messages.find(m => m.sender === 'user')
  if (firstUserMessage) {
    return firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
  }
  return 'New Chat'
}

export const useChatSessions = create<ChatSessionsState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      currentSession: null,
      
      createNewSession: () => {
        const id = Date.now().toString()
        const newSession: ChatSession = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: id,
          currentSession: newSession,
        }))
        
        return newSession
      },
      
      deleteSession: (id) => {
        set((state) => {
          const newSessions = state.sessions.filter(s => s.id !== id)
          const newCurrentSessionId = state.currentSessionId === id ? 
            (newSessions.length > 0 ? newSessions[0].id : null) : 
            state.currentSessionId
          const newCurrentSession = newCurrentSessionId ? 
            newSessions.find(s => s.id === newCurrentSessionId) || null : 
            null
          
          return {
            sessions: newSessions,
            currentSessionId: newCurrentSessionId,
            currentSession: newCurrentSession,
          }
        })
      },
      
      setCurrentSessionId: (id) => {
        const session = get().sessions.find(s => s.id === id)
        set({
          currentSessionId: id,
          currentSession: session || null,
        })
      },
      
      addMessageToSession: (sessionId, message) => {
        set((state) => {
          const sessions = state.sessions.map(session => {
            if (session.id === sessionId) {
              const updatedMessages = [...session.messages, message]
              const updatedSession = {
                ...session,
                messages: updatedMessages,
                title: updatedMessages.length === 1 ? generateTitle(updatedMessages) : session.title,
                updatedAt: new Date(),
              }
              return updatedSession
            }
            return session
          })
          
          const currentSession = sessions.find(s => s.id === sessionId) || null
          
          return {
            sessions,
            currentSession: state.currentSessionId === sessionId ? currentSession : state.currentSession,
          }
        })
      },
      
      updateSessionTitle: (sessionId, title) => {
        set((state) => {
          const sessions = state.sessions.map(session =>
            session.id === sessionId ? { ...session, title, updatedAt: new Date() } : session
          )
          
          const currentSession = state.currentSessionId === sessionId ? 
            sessions.find(s => s.id === sessionId) || null : 
            state.currentSession
          
          return {
            sessions,
            currentSession,
          }
        })
      },
    }),
    {
      name: 'chat-sessions',
    }
  )
)