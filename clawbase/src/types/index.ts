export interface Agent {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  status: 'idle' | 'working' | 'error';
  currentTask?: string;
}

export interface Team {
  id: string;
  name: string;
  agentIds: string[];
}

export type Provider = 'anthropic' | 'openai' | 'opencode' | 'kimi' | 'minimax';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

export interface ChatPane {
  id: string;
  agentId: string;
  messages: Message[];
  hasNewMessage: boolean;
  input: string;
}

export interface Notification {
  id: string;
  agentId: string;
  agentName: string;
  preview: string;
  timestamp: number;
  read: boolean;
}
