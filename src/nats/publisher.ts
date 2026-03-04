/**
 * NATS Publisher Module
 *
 * Simplified publish functions for TinyClaw.
 * No KV store - pure message passing only.
 */

import { getNATS, getJSONCodec } from './connection';
import { STREAM_PREFIX } from './index';
import { AgentMessage, ResponseMessage, EventMessage, EventType } from './types';
import { log, emitEvent } from '../lib/logging';

const jc = getJSONCodec();

/**
 * Publish a user message to an agent's message queue
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

  await js.publish(`${STREAM_PREFIX}.messages.${firstAgent}`, jc.encode(message));
  log('INFO', `Enqueued message for agent ${firstAgent}`);
}

/**
 * Publish a final response to be sent to the user
 */
export async function publishResponse(
  conversationId: string,
  response: ResponseMessage
): Promise<void> {
  const { js } = getNATS();
  const channel = response.channel || 'api';

  await js.publish(`${STREAM_PREFIX}.responses.${channel}`, jc.encode(response));
  log('INFO', `Published response for conversation ${conversationId}`);
}

/**
 * Publish an event for UI/real-time updates
 */
export async function publishEvent(
  eventType: EventType,
  data: Record<string, unknown>
): Promise<void> {
  const { js } = getNATS();

  const event: EventMessage = {
    type: eventType,
    timestamp: Date.now(),
    data,
  };

  await js.publish(`${STREAM_PREFIX}.events.${eventType}`, jc.encode(event));
  emitEvent(eventType, { ...data, timestamp: event.timestamp });
}
