export interface Message {
  role: 'user' | 'agent';
  agentId?: string;
  content: string;
  timestamp?: number;
}

export interface AgentMessage {
  conversationId: string;
  from: string;
  content: string;
  history: Message[];
  channel?: string;
  sender?: string;
  senderId?: string;
}

export interface ResponseMessage {
  conversationId: string;
  response: string;
  history: Message[];
  agentId: string;
  channel?: string;
  sender?: string;
}

export interface HandoffResult {
  agentId: string;
  message: string;
}

export type EventType = 
  | 'message_received'
  | 'agent_routed'
  | 'chain_step_start'
  | 'chain_step_done'
  | 'chain_handoff'
  | 'team_chain_start'
  | 'team_chain_end'
  | 'response_ready'
  | 'processor_start';

export interface EventMessage {
  type: EventType;
  timestamp: number;
  data: Record<string, unknown>;
}