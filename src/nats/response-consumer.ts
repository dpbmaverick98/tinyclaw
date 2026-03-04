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
import { DeliverPolicy, AckPolicy } from 'nats';

const jc = getJSONCodec();

// Track active consumers (store the consume iterator so we can close it)
const activeConsumers = new Map<string, { close: () => void }>();

/**
 * Start a consumer for a channel's responses
 *
 * @param channel - Channel name (telegram, discord, whatsapp, api)
 * @param onResponse - Callback when response received
 * @returns Promise that resolves when consumer stops
 */
export async function startResponseConsumer(
  channel: string,
  onResponse: (response: ResponseMessage) => Promise<void>
): Promise<void> {
  const { js, jsm } = getNATS();
  const prefix = getStreamPrefix();
  const streamName = `${prefix}_RESPONSES`;
  const subject = `${prefix}.responses.${channel}`;
  const durableName = `responses-${channel}`;

  // Stop existing consumer if any
  stopResponseConsumer(channel);

  log('INFO', `Starting response consumer for ${channel} on ${subject}`);

  // Create durable pull consumer (no deliver_subject = pull, not push)
  try {
    await jsm.consumers.add(streamName, {
      durable_name: durableName,
      deliver_policy: DeliverPolicy.All,
      ack_policy: AckPolicy.Explicit,
      max_ack_pending: 10,
      ack_wait: 30 * 1000 * 1000000, // 30 seconds in nanoseconds
      filter_subject: subject,
    });
  } catch (err) {
    const msg = (err as Error).message || '';
    if (!msg.includes('consumer already exists')) throw err;
  }

  const consumer = await js.consumers.get(streamName, durableName);
  const messages = await consumer.consume();

  // Store reference so stopResponseConsumer can close it
  activeConsumers.set(channel, messages);

  log('INFO', `Response consumer for ${channel} started`);

  try {
    for await (const msg of messages) {
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
  } finally {
    activeConsumers.delete(channel);
  }
}

/**
 * Stop a response consumer
 */
export function stopResponseConsumer(channel: string): void {
  const messages = activeConsumers.get(channel);
  if (messages) {
    messages.close();
    activeConsumers.delete(channel);
    log('INFO', `Stopped response consumer for ${channel}`);
  }
}

/**
 * Get recent responses for a channel (for polling fallback)
 *
 * Uses an ordered (ephemeral) pull consumer to read the last N messages.
 */
export async function getRecentResponses(
  channel: string,
  limit: number = 20
): Promise<ResponseMessage[]> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  const streamName = `${prefix}_RESPONSES`;

  const responses: ResponseMessage[] = [];

  try {
    // Ordered consumer = ephemeral, auto-managed, no ack needed
    const consumer = await js.consumers.get(streamName, {
      filterSubjects: [`${prefix}.responses.${channel}`],
    });

    const messages = await consumer.fetch({ max_messages: limit, expires: 1000 });

    for await (const msg of messages) {
      responses.push(jc.decode(msg.data) as ResponseMessage);
    }
  } catch (err) {
    log('ERROR', `Failed to get recent responses: ${(err as Error).message}`);
  }

  return responses.slice(-limit);
}
