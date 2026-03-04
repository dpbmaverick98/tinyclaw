/**
 * NATS Type Definitions
 * 
 * TypeScript interfaces for NATS-based message queue.
 * Replaces/enhances types previously used with SQLite.
 */

/**
 * A message in the conversation history
 */
export interface Message {
  role: 'user' | 'agent';
  agentId?: string;
  content: string;
  timestamp?: number;
}

/**
 * Message sent to an agent for processing
 */
export interface AgentMessage {
  /** Unique conversation identifier */
  conversationId: string;
  /** Who sent this message (user or agent ID) */
  from: string;
  /** Message content */
  content: string;
  /** Full conversation history */
  history: Message[];
  /** Source channel (telegram, discord, whatsapp, api) */
  channel?: string;
  /** Display name of sender */
  sender?: string;
  /** Unique ID of sender (for replies) */
  senderId?: string;
  /** Attached files */
  files?: string[];
}

/**
 * Final response to be sent to user
 */
export interface ResponseMessage {
  conversationId: string;
  /** The final response text */
  response: string;
  /** Full conversation history */
  history: Message[];
  /** Last agent that responded */
  agentId: string;
  /** Source channel */
  channel?: string;
  /** Display name of recipient */
  sender?: string;
  /** Unique ID of recipient */
  senderId?: string;
  /** Files to attach */
  files?: string[];
  /** Plugin metadata */
  metadata?: Record<string, unknown>;
  /** Original user message (for reference) */
  originalMessage?: string;
  /** When response was created */
  createdAt?: number;
}

/**
 * Parsed handoff mention [@agent: message]
 */
export interface HandoffResult {
  /** Target agent ID */
  agentId: string;
  /** Message content for target agent */
  message: string;
}

/**
 * Event types for UI/real-time updates
 */
export type EventType = 
  | 'message_received'    // New message from user
  | 'message_enqueued'    // Message added to queue
  | 'agent_routed'        // Message routed to specific agent
  | 'chain_step_start'    // Agent started processing
  | 'chain_step_done'     // Agent finished processing
  | 'chain_handoff'       // Handoff to teammate
  | 'team_chain_start'    // Team conversation started
  | 'team_chain_end'      // Team conversation completed
  | 'response_ready'      // Final response ready
  | 'processor_start'     // Orchestrator started
  | 'processor_error';    // Processing error

/**
 * Event message for SSE/UI
 */
export interface EventMessage {
  type: EventType;
  timestamp: number;
  data: Record<string, unknown>;
}

/**
 * Conversation state stored in NATS KV
 */
export interface ConversationState {
  id: string;
  channel: string;
  sender: string;
  senderId?: string;
  originalMessage: string;
  messageId: string;
  /** Number of pending branches */
  pending: number;
  /** Agent responses collected so far */
  responses: Array<{ agentId: string; response: string }>;
  /** Files referenced in conversation */
  files: string[];
  /** Total messages processed */
  totalMessages: number;
  /** Max messages before cutoff */
  maxMessages: number;
  /** Team context */
  teamContext?: {
    teamId: string;
    teamName: string;
    leaderAgent: string;
    agents: string[];
  };
  /** When conversation started */
  startTime: number;
  /** Agents with pending messages */
  pendingAgents: string[];
}

/**
 * Consumer configuration for an agent
 */
export interface AgentConsumerConfig {
  agentId: string;
  /** Durable consumer name */
  durableName: string;
  /** Subject to subscribe to */
  subject: string;
  /** Max unacknowledged messages (1 = sequential) */
  maxAckPending: number;
  /** Time to wait for ack before redelivery */
  ackWait: number;
}