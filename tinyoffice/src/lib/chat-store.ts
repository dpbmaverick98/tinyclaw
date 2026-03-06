import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'error';
  error?: string;
}

export interface ChatThread {
  id: string;
  type: 'agent' | 'team';
  name: string;
  messages: ChatMessage[];
  lastMessageAt: number;
  unreadCount: number;
}

interface ChatStore {
  threads: Record<string, ChatThread>;
  activeThreadId: string | null;
  
  // Actions
  getOrCreateThread: (id: string, type: 'agent' | 'team', name: string) => ChatThread;
  addMessage: (threadId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  markThreadAsRead: (threadId: string) => void;
  setActiveThread: (threadId: string | null) => void;
  clearThread: (threadId: string) => void;
  getThreadMessages: (threadId: string) => ChatMessage[];
  getUnreadCount: (threadId: string) => number;
  getTotalUnreadCount: () => number;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      threads: {},
      activeThreadId: null,

      getOrCreateThread: (id, type, name) => {
        const { threads } = get();
        if (threads[id]) {
          return threads[id];
        }
        
        const newThread: ChatThread = {
          id,
          type,
          name,
          messages: [],
          lastMessageAt: Date.now(),
          unreadCount: 0,
        };
        
        set({ threads: { ...threads, [id]: newThread } });
        return newThread;
      },

      addMessage: (threadId, message) => {
        const { threads, activeThreadId } = get();
        const thread = threads[threadId];
        if (!thread) return;

        const newMessage: ChatMessage = {
          ...message,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
        };

        const isUnread = activeThreadId !== threadId && message.role === 'agent';

        set({
          threads: {
            ...threads,
            [threadId]: {
              ...thread,
              messages: [...thread.messages, newMessage],
              lastMessageAt: newMessage.timestamp,
              unreadCount: isUnread ? thread.unreadCount + 1 : thread.unreadCount,
            },
          },
        });
      },

      updateMessage: (threadId, messageId, updates) => {
        const { threads } = get();
        const thread = threads[threadId];
        if (!thread) return;

        set({
          threads: {
            ...threads,
            [threadId]: {
              ...thread,
              messages: thread.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
            },
          },
        });
      },

      markThreadAsRead: (threadId) => {
        const { threads } = get();
        const thread = threads[threadId];
        if (!thread || thread.unreadCount === 0) return;

        set({
          threads: {
            ...threads,
            [threadId]: {
              ...thread,
              unreadCount: 0,
            },
          },
        });
      },

      setActiveThread: (threadId) => {
        set({ activeThreadId: threadId });
        if (threadId) {
          get().markThreadAsRead(threadId);
        }
      },

      clearThread: (threadId) => {
        const { threads } = get();
        const thread = threads[threadId];
        if (!thread) return;

        set({
          threads: {
            ...threads,
            [threadId]: {
              ...thread,
              messages: [],
              lastMessageAt: Date.now(),
              unreadCount: 0,
            },
          },
        });
      },

      getThreadMessages: (threadId) => {
        return get().threads[threadId]?.messages || [];
      },

      getUnreadCount: (threadId) => {
        return get().threads[threadId]?.unreadCount || 0;
      },

      getTotalUnreadCount: () => {
        return Object.values(get().threads).reduce(
          (sum, thread) => sum + thread.unreadCount,
          0
        );
      },
    }),
    {
      name: 'tinyclaw-chat-storage',
      version: 1,
    }
  )
);
