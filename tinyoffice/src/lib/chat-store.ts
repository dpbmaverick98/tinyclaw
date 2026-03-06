import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// UUID generator for message IDs (no collision risk)
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`;
}

// Storage quota checker (4MB limit for localStorage)
const STORAGE_LIMIT = 4 * 1024 * 1024;
const STORAGE_WARNING = 3 * 1024 * 1024;

function checkStorageSize(): { ok: boolean; size: number; warning: boolean } {
  try {
    const item = localStorage.getItem('tinyclaw-chat-storage');
    const size = item ? new Blob([item]).size : 0;
    return {
      ok: size < STORAGE_LIMIT,
      size,
      warning: size > STORAGE_WARNING,
    };
  } catch {
    return { ok: true, size: 0, warning: false };
  }
}

function pruneOldMessages(threads: Record<string, ChatThread>): Record<string, ChatThread> {
  const pruned: Record<string, ChatThread> = {};
  
  for (const [id, thread] of Object.entries(threads)) {
    // Keep only last 100 messages per thread
    const messages = thread.messages.slice(-100);
    pruned[id] = {
      ...thread,
      messages,
    };
  }
  
  return pruned;
}

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
          id: generateId(),
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
      migrate: (persistedState: unknown, version: number) => {
        // Migration from version 0 to 1
        if (version === 0) {
          // Ensure threads object exists
          const state = persistedState as { threads?: Record<string, ChatThread> };
          return {
            threads: state.threads || {},
            activeThreadId: null,
          };
        }
        return persistedState;
      },
      onRehydrateStorage: () => {
        return (state) => {
          if (!state) return;
          
          // Check storage size and prune if needed
          const { ok, warning, size } = checkStorageSize();
          
          if (!ok) {
            console.warn(`[ChatStore] Storage exceeded limit (${size} bytes). Pruning old messages...`);
            const pruned = pruneOldMessages(state.threads);
            state.threads = pruned;
          } else if (warning) {
            console.warn(`[ChatStore] Storage approaching limit (${size} bytes)`);
          }
        };
      },
    }
  )
);
