export type Provider = 'anthropic' | 'openai' | 'opencode' | 'kimi' | 'minimax';

export interface AgentConfig {
  name: string;
  provider: Provider;
  model: string;
  working_directory: string;
  system_prompt?: string;
  prompt_file?: string;
}

export interface TeamConfig {
  name: string;
  agents: string[];
  leader_agent: string;
}

export interface Agent {
  id: string;
  config: AgentConfig;
  status: 'idle' | 'active' | 'error' | 'offline';
  lastActivity?: number;
  messageCount?: number;
  fileCount?: number;
  teamId?: string;
  isLeader?: boolean;
}

export interface Team {
  id: string;
  config: TeamConfig;
  agents: Agent[];
}

export interface QueueStatus {
  incoming: number;
  processing: number;
  outgoing: number;
  dead: number;
  activeConversations: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  agentId?: string;
  files?: string[];
}

export interface SSEEvent {
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

export const PROVIDER_COLORS: Record<Provider, string> = {
  anthropic: '#D4A574',
  openai: '#10A37F',
  opencode: '#6366F1',
  kimi: '#E53935',
  minimax: '#F59E0B',
};

export const PROVIDER_ICONS: Record<Provider, string> = {
  anthropic: '◉',
  openai: '◇',
  opencode: '○',
  kimi: '●',
  minimax: '◆',
};
