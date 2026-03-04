/**
 * Client Consumer Module
 *
 * Shared module for channel clients (Telegram, Discord, WhatsApp) to consume
 * responses directly from NATS. Replaces HTTP polling with direct NATS pull
 * consumers.
 *
 * This module handles:
 * - Connecting to NATS (with retry)
 * - Creating/reusing durable pull consumers
 * - Message decoding and delivery
 * - Graceful shutdown
 * - Auto-reconnect on errors
 */

import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  DeliverPolicy,
  AckPolicy,
  RetentionPolicy,
  StorageType,
  JSONCodec,
} from 'nats';
import { ResponseMessage } from './types';

const jc = JSONCodec();

// Track active consumers per channel
const activeConsumers = new Map<string, { close: () => void }>();

// Reconnection configuration
const RECONNECT_BASE_DELAY = 1000; // 1 second
const RECONNECT_MAX_DELAY = 30000; // 30 seconds

/**
 * Connect to NATS and start consuming responses for a channel
 *
 * This is designed to be called by channel client processes (telegram-client.ts,
 * discord-client.ts, whatsapp-client.ts) which run independently from the
 * orchestrator.
 *
 * @param channel - Channel name (telegram, discord, whatsapp)
 * @param onResponse - Callback when response received. MUST call ack() or nak()
 * @returns Object with stop() function for graceful shutdown
 *
 * @example
 * const consumer = await connectAndConsume('telegram', async (response, ack, nak) => {
 *   try {
 *     await sendToTelegram(response);
 *     ack(); // Message removed from NATS
 *   } catch (err) {
 *     nak(); // Message redelivered later
 *   }
 * });
 *
 * // On shutdown:
 * consumer.stop();
 */
export async function connectAndConsume(
  channel: string,
  onResponse: (
    response: ResponseMessage,
    ack: () => void,
    nak: () => void
  ) => Promise<void>
): Promise<{ stop: () => void }> {
  // Normalize URL: ensure nats:// scheme is present
  const rawUrl = process.env.NATS_URL || 'localhost:4222';
  const url = rawUrl.includes('://') ? rawUrl : `nats://${rawUrl}`;
  const prefix = process.env.NATS_STREAM_PREFIX || 'tinyclaw';
  const streamName = `${prefix}_RESPONSES`;
  const subject = `${prefix}.responses.${channel}`;
  const durableName = `responses-${channel}`;

  // Stop any existing consumer for this channel
  stopConsumer(channel);

  // Connect to NATS with retry logic
  const { nc, js, jsm } = await connectWithRetry(url, channel);

  // Ensure stream exists (orchestrator creates it, but we check for safety)
  await ensureStreamExists(jsm, streamName, prefix);

  // Create durable pull consumer (idempotent - ok if already exists)
  await createConsumer(jsm, streamName, durableName, subject);

  // Start consuming messages
  const consumer = await js.consumers.get(streamName, durableName);
  const messages = await consumer.consume();

  // Store for stop() functionality
  activeConsumers.set(channel, messages);

  // Start the consume loop (don't await - runs in background)
  runConsumeLoop(channel, messages, onResponse, nc);

  return {
    stop: () => {
      stopConsumer(channel);
      closeConnection(nc, channel);
    },
  };
}

/**
 * Connect to NATS with exponential backoff retry
 */
async function connectWithRetry(
  url: string,
  channel: string
): Promise<{ nc: NatsConnection; js: JetStreamClient; jsm: JetStreamManager }> {
  let attempt = 0;

  while (true) {
    try {
      const nc = await connect({
        servers: url,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 1000,
      });

      const js = nc.jetstream();
      const jsm = await js.jetstreamManager();

      console.log(`[${channel}] NATS connected to ${url}`);
      return { nc, js, jsm };
    } catch (err) {
      attempt++;
      const delay = Math.min(
        RECONNECT_BASE_DELAY * Math.pow(2, attempt - 1),
        RECONNECT_MAX_DELAY
      );

      console.error(
        `[${channel}] NATS connection failed (attempt ${attempt}), retrying in ${delay}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Ensure the responses stream exists
 * Stream is normally created by orchestrator, but we verify for safety
 */
async function ensureStreamExists(
  jsm: JetStreamManager,
  streamName: string,
  prefix: string
): Promise<void> {
  try {
    await jsm.streams.info(streamName);
  } catch (err) {
    // Stream doesn't exist - orchestrator should create it, but we'll create as fallback
    try {
      await jsm.streams.add({
        name: streamName,
        subjects: [`${prefix}.responses.>`],
        retention: RetentionPolicy.Limits,
        max_msgs: 1000,
        max_age: 60 * 60 * 1000 * 1000000, // 1h in nanoseconds
        storage: StorageType.File,
      });
      console.log(`[${streamName}] Created stream`);
    } catch (createErr) {
      // Stream might have been created by another client simultaneously
      const msg = (createErr as Error).message || '';
      if (!msg.includes('already exists')) {
        throw createErr;
      }
    }
  }
}

/**
 * Create durable pull consumer (idempotent)
 */
async function createConsumer(
  jsm: JetStreamManager,
  streamName: string,
  durableName: string,
  subject: string
): Promise<void> {
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
    if (!msg.includes('consumer already exists')) {
      throw err;
    }
  }
}

/**
 * Run the consume loop
 *
 * Note: This function is fire-and-forget. It runs indefinitely until
 * the consumer is stopped or an unrecoverable error occurs. Errors are
 * handled internally - the loop will continue processing messages even
 * after individual message errors (those trigger msg.nak()).
 */
async function runConsumeLoop(
  channel: string,
  messages: { [Symbol.asyncIterator](): AsyncIterator<any>; close(): void },
  onResponse: (
    response: ResponseMessage,
    ack: () => void,
    nak: () => void
  ) => Promise<void>,
  nc: NatsConnection
): Promise<void> {
  try {
    for await (const msg of messages) {
      try {
        const response = jc.decode(msg.data) as ResponseMessage;

        await onResponse(
          response,
          () => msg.ack(),
          () => msg.nak()
        );
      } catch (err) {
        console.error(`[${channel}] Error processing message:`, err);
        msg.nak();
      }
    }
  } catch (err) {
    console.error(`[${channel}] Consume loop error:`, err);
  } finally {
    activeConsumers.delete(channel);
  }
}

/**
 * Stop a consumer for a channel
 */
function stopConsumer(channel: string): void {
  const messages = activeConsumers.get(channel);
  if (messages) {
    messages.close();
    activeConsumers.delete(channel);
  }
}

/**
 * Close NATS connection gracefully
 */
async function closeConnection(nc: NatsConnection, channel: string): Promise<void> {
  try {
    await nc.drain();
    console.log(`[${channel}] NATS connection closed`);
  } catch (err) {
    console.error(`[${channel}] Error closing NATS connection:`, err);
  }
}
