/**
 * Response Consumer Module
 * 
 * Consumes final responses from NATS and delivers to channel clients.
 * Each channel has its own consumer for the responses.{channel} subject.
 */

import { getNATS, getJSONCodec } from './connection';
import { getStreamPrefix } from './streams';
import { ResponseMessage } from './types';
import { log } from '../lib/logging';

const jc = getJSONCodec();

// Track active consumers
const activeConsumers = new Map<string, AbortController>();

/**
 * Start a consumer for a channel's responses
 * 
 * @param channel - Channel name (telegram, discord, whatsapp, api)
 * @param onResponse - Callback when response received
 * @returns Consumer instance
 */
export async function startResponseConsumer(
  channel: string,
  onResponse: (response: ResponseMessage) => Promise<void>
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  const subject = `${prefix}.responses.${channel}`;
  const durableName = `responses-${channel}`;
  
  // Stop existing consumer if any
  stopResponseConsumer(channel);
  
  log('INFO', `Starting response consumer for ${channel} on ${subject}`);
  
  const sub = await js.subscribe(subject, {
    config: {
      durable_name: durableName,
      deliver_policy: 'all',
      ack_policy: 'explicit',
      max_ack_pending: 10, // Allow some parallelism for responses
      ack_wait: 30 * 1000 * 1000000, // 30 seconds
    },
  });
  
  log('INFO', `Response consumer for ${channel} started`);
  
  // Process responses
  for await (const msg of sub) {
    try {
      const response = jc.decode(msg.data) as ResponseMessage;
      log('INFO', `[${channel}] Delivering response to ${response.sender}`);
      
      await onResponse(response);
      msg.ack();
    } catch (err) {
      log('ERROR', `[${channel}] Failed to deliver response: ${(err as Error).message}`);
      msg.nak();
    }
  }
}

/**
 * Stop a response consumer
 */
export function stopResponseConsumer(channel: string): void {
  const controller = activeConsumers.get(channel);
  if (controller) {
    controller.abort();
    activeConsumers.delete(channel);
    log('INFO', `Stopped response consumer for ${channel}`);
  }
}

/**
 * Get recent responses for a channel (for polling fallback)
 * 
 * This allows channel clients to poll if they don't want to use
 * the consumer directly.
 */
export async function getRecentResponses(
  channel: string,
  limit: number = 20
): Promise<ResponseMessage[]> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  
  const responses: ResponseMessage[] = [];
  
  try {
    // Create ephemeral consumer to read recent messages
    const sub = await js.subscribe(`${prefix}.responses.${channel}`, {
      config: {
        deliver_policy: 'last',
        ack_policy: 'none', // Don't ack, just read
      },
      max: limit,
    });
    
    for await (const msg of sub) {
      responses.push(jc.decode(msg.data) as ResponseMessage);
    }
  } catch (err) {
    log('ERROR', `Failed to get recent responses: ${(err as Error).message}`);
  }
  
  return responses.reverse(); // Oldest first
}