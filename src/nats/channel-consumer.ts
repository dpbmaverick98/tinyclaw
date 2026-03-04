/**
 * Channel Consumer Module
 *
 * Simplified consumer for channel clients (Telegram, Discord, WhatsApp).
 * Uses NATS built-in reconnection - no custom wrapper needed.
 *
 * NATS handles reconnection automatically when configured with:
 * - reconnect: true
 * - maxReconnectAttempts: -1 (infinite)
 *
 * The consume() iterator survives reconnects and resumes automatically.
 * Per NATS docs: "All client libraries will automatically re-connect and
 * re-establish all subscriptions."
 */

import { connect, JSONCodec } from 'nats';
import { ResponseMessage } from './types';
import { STREAM_PREFIX } from './index';

const jc = JSONCodec();

/**
 * Start consuming responses for a channel.
 *
 * Uses NATS built-in reconnection. The consume() iterator will:
 * 1. Auto-recover when NATS reconnects
 * 2. Resume from last acknowledged message
 * 3. Handle heartbeat monitoring internally
 *
 * @param channel - Channel name (telegram, discord, whatsapp)
 * @param onResponse - Callback when response received. MUST call ack() or nak()
 *
 * Assumptions:
 * - NATS_URL and NATS_STREAM_PREFIX env vars are set
 * - Stream and consumer are created by orchestrator
 * - Consumer uses durable pull with explicit ack
 */
export async function startChannelConsumer(
  channel: string,
  onResponse: (
    response: ResponseMessage,
    ack: () => void,
    nak: () => void
  ) => Promise<void>
): Promise<void> {
  const nc = await connect({
    servers: process.env.NATS_URL || 'nats://localhost:4222',
    reconnect: true,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 1000,
  });

  const js = nc.jetstream();

  // Get existing consumer (created by orchestrator)
  const consumer = await js.consumers.get(`${STREAM_PREFIX}_RESPONSES`, `responses-${channel}`);

  // consume() auto-recovers on reconnect - no wrapper needed
  const messages = await consumer.consume();

  for await (const msg of messages) {
    try {
      const response = jc.decode(msg.data) as ResponseMessage;
      await onResponse(response, () => msg.ack(), () => msg.nak());
    } catch (err) {
      console.error(`[${channel}] Error processing message:`, err);
      msg.nak();
    }
  }
}
