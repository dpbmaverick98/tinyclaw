/**
 * NATS Publisher Module
 *
 * Functions to publish messages to NATS JetStream.
 * Replaces the SQLite enqueue functions from db.ts
 */

import { getNATS, getJSONCodec } from './connection';
import { getStreamPrefix } from './streams';
import { AgentMessage, ResponseMessage, EventMessage, EventType, ConversationState } from './types';
import { log, emitEvent } from '../lib/logging';

const jc = getJSONCodec();

/**
 * Publish a user message to an agent's message queue
 *
 * @param conversationId - Unique conversation ID
 * @param content - Message content
 * @param firstAgent - Target agent ID
 * @param channel - Source channel
 * @param sender - Display name of sender
 * @param senderId - Unique ID of sender
 * @param files - Attached files
 */
export async function enqueueUserMessage(
  conversationId: string,
  content: string,
  firstAgent: string,
  channel: string,
  sender: string,
  senderId?: string,
  files?: string[]
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();

  const message: AgentMessage = {
    conversationId,
    from: sender,
    content,
    history: [{ role: 'user', content, timestamp: Date.now() }],
    channel,
    sender,
    senderId,
    files,
  };

  await js.publish(`${prefix}.messages.${firstAgent}`, jc.encode(message));
  log('INFO', `Enqueued message for agent ${firstAgent}`);
}

/**
 * Publish an internal message (agent-to-agent handoff)
 *
 * @param conversationId - Conversation ID
 * @param fromAgent - Source agent ID
 * @param toAgent - Target agent ID
 * @param message - Message content
 * @param history - Conversation history
 * @param context - Original message context
 */
export async function enqueueInternalMessage(
  conversationId: string,
  fromAgent: string,
  toAgent: string,
  message: string,
  history: Array<{ role: 'user' | 'agent'; agentId?: string; content: string; timestamp?: number }>,
  context: {
    channel: string;
    sender: string;
    senderId?: string | null;
    messageId: string;
  }
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();

  const agentMessage: AgentMessage = {
    conversationId,
    from: fromAgent,
    content: message,
    history: history.map(h => ({
      role: h.role,
      agentId: h.agentId,
      content: h.content,
      timestamp: h.timestamp || Date.now(),
    })),
    channel: context.channel,
    sender: context.sender,
    senderId: context.senderId || undefined,
  };

  await js.publish(`${prefix}.messages.${toAgent}`, jc.encode(agentMessage));
  log('INFO', `Enqueued internal message: ${fromAgent} → ${toAgent}`);
}

/**
 * Publish a final response to be sent to the user
 *
 * @param conversationId - Conversation ID
 * @param response - Response data
 */
export async function publishResponse(
  conversationId: string,
  response: ResponseMessage
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  const channel = response.channel || 'api';

  await js.publish(`${prefix}.responses.${channel}`, jc.encode(response));
  log('INFO', `Published response for conversation ${conversationId}`);
}

/**
 * Publish an event for UI/real-time updates
 *
 * @param eventType - Type of event
 * @param data - Event data
 */
export async function publishEvent(
  eventType: EventType,
  data: Record<string, unknown>
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();

  const event: EventMessage = {
    type: eventType,
    timestamp: Date.now(),
    data,
  };

  await js.publish(`${prefix}.events.${eventType}`, jc.encode(event));

  // Also emit in-process so SSE broadcast picks it up (orchestrator + API server share the same process)
  emitEvent(eventType, { ...data, timestamp: event.timestamp });
}

/**
 * KV bucket names
 */
const KV_BUCKETS = {
  CONVERSATIONS: `${getStreamPrefix()}_conversations`,
};

let kvConversations: any = null;

/**
 * Initialize KV buckets
 */
export async function initKV(): Promise<void> {
  const { js } = getNATS();

  try {
    // Try to get existing bucket
    kvConversations = await js.views.kv(KV_BUCKETS.CONVERSATIONS);
    log('DEBUG', 'KV bucket conversations already exists');
  } catch {
    // Create if doesn't exist
    kvConversations = await js.views.kv(KV_BUCKETS.CONVERSATIONS, {
      history: 1,
      ttl: 30 * 60 * 1000 * 1000000, // 30 min in nanoseconds
    });
    log('INFO', 'Created KV bucket: conversations');
  }
}

/**
 * Save conversation state to KV store
 */
export async function saveConversationState(state: ConversationState): Promise<void> {
  if (!kvConversations) {
    await initKV();
  }

  await kvConversations.put(state.id, jc.encode(state));
}

/**
 * Get conversation state from KV store
 */
export async function getConversationState(convId: string): Promise<ConversationState | null> {
  if (!kvConversations) {
    await initKV();
  }

  try {
    const entry = await kvConversations.get(convId);
    if (!entry) return null;
    return jc.decode(entry.value) as ConversationState;
  } catch {
    return null;
  }
}

/**
 * Atomically update conversation state: append a response, adjust pending count, and
 * remove the agent from pendingAgents. Uses KV revision-based CAS to handle concurrent
 * writes from parallel agent branches.
 *
 * @param convId - Conversation ID
 * @param agentId - Agent that just finished
 * @param response - Agent's response text
 * @param pendingDelta - Change to pending count (e.g. +mentions.length - 1 for handoff, -1 for leaf)
 * @param addPendingAgents - Agent IDs to add to pendingAgents (for handoff targets)
 * @returns Updated state, or null if conversation no longer exists
 */
export async function atomicConvUpdate(
  convId: string,
  agentId: string,
  response: string,
  pendingDelta: number,
  addPendingAgents: string[] = []
): Promise<ConversationState | null> {
  if (!kvConversations) {
    await initKV();
  }

  // CAS loop with exponential backoff + jitter to avoid lockstep retries
  for (let attempt = 0; attempt < 10; attempt++) {
    const entry = await kvConversations.get(convId);
    if (!entry) return null;

    // Clone to avoid mutating the decoded object
    const state: ConversationState = JSON.parse(JSON.stringify(jc.decode(entry.value)));
    state.responses.push({ agentId, response });
    state.pending += pendingDelta;
    state.totalMessages++;
    state.pendingAgents = state.pendingAgents.filter((a: string) => a !== agentId);
    state.pendingAgents.push(...addPendingAgents);

    try {
      await kvConversations.update(convId, jc.encode(state), entry.revision);
      return state;
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes('wrong last sequence')) {
        // Exponential backoff with jitter: 10-20ms, 20-40ms, 40-80ms, ...
        const baseDelay = 10 * Math.pow(2, attempt);
        const jitter = Math.random() * baseDelay;
        await new Promise(r => setTimeout(r, baseDelay + jitter));
        continue;
      }
      throw err;
    }
  }

  // All retries exhausted — fail loudly rather than risk silent data loss
  const errMsg = `KV CAS failed after 10 retries for conversation ${convId} (agent: ${agentId})`;
  log('ERROR', errMsg);
  throw new Error(errMsg);
}

/**
 * Delete conversation state from KV store
 */
export async function deleteConversationState(convId: string): Promise<void> {
  if (!kvConversations) {
    await initKV();
  }

  await kvConversations.delete(convId);
}