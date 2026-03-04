/**
 * NATS JetStream Setup
 * 
 * Creates and manages JetStream streams for TinyClaw.
 * Streams provide durable, ordered message storage.
 */

import { getNATS } from './connection';
import { log } from '../lib/logging';

const STREAM_PREFIX = process.env.NATS_STREAM_PREFIX || 'tinyclaw';

/**
 * Get the stream prefix for subject namespacing
 */
export function getStreamPrefix(): string {
  return STREAM_PREFIX;
}

/**
 * Setup all required JetStream streams
 * 
 * Creates streams if they don't exist, skips if already present.
 * Called once during orchestrator startup.
 */
export async function setupStreams(): Promise<void> {
  const { jsm } = getNATS();
  
  // MESSAGES stream - Incoming messages for agents
  // Subjects: tinyclaw.messages.{agentId}
  await createStream(jsm, {
    name: `${STREAM_PREFIX}_MESSAGES`,
    subjects: [`${STREAM_PREFIX}.messages.\u003e`],
    retention: 'limits',
    maxMsgs: 10000,
    maxAge: 24 * 60 * 60 * 1000 * 1000000, // 24h in nanoseconds
    storage: 'file',
  });
  
  // RESPONSES stream - Outgoing responses to channels
  // Subjects: tinyclaw.responses.{channel}
  await createStream(jsm, {
    name: `${STREAM_PREFIX}_RESPONSES`,
    subjects: [`${STREAM_PREFIX}.responses.\u003e`],
    retention: 'limits',
    maxMsgs: 1000,
    maxAge: 60 * 60 * 1000 * 1000000, // 1h in nanoseconds
    storage: 'file',
  });
  
  // EVENTS stream - Real-time events for UI
  // Subjects: tinyclaw.events.{eventType}
  await createStream(jsm, {
    name: `${STREAM_PREFIX}_EVENTS`,
    subjects: [`${STREAM_PREFIX}.events.\u003e`],
    retention: 'limits',
    maxMsgs: 5000,
    maxAge: 24 * 60 * 60 * 1000 * 1000000, // 24h in nanoseconds
    storage: 'memory', // Events are ephemeral, replay not needed
  });
  
  log('INFO', 'NATS streams initialized');
}

/**
 * Helper to create a stream, handling "already exists" error
 */
async function createStream(jsm: any, config: {
  name: string;
  subjects: string[];
  retention: string;
  maxMsgs: number;
  maxAge: number;
  storage: string;
}): Promise<void> {
  try {
    await jsm.streams.add(config);
    log('INFO', `Created stream: ${config.name}`);
  } catch (err) {
    const errorMsg = (err as Error).message;
    if (errorMsg.includes('already exists') || errorMsg.includes('unique')) {
      log('DEBUG', `Stream ${config.name} already exists`);
    } else {
      throw err;
    }
  }
}

/**
 * Delete all TinyClaw streams (useful for testing/reset)
 */
export async function deleteStreams(): Promise<void> {
  const { jsm } = getNATS();
  const streams = ['MESSAGES', 'RESPONSES', 'EVENTS'];
  
  for (const stream of streams) {
    try {
      await jsm.streams.delete(`${STREAM_PREFIX}_${stream}`);
      log('INFO', `Deleted stream: ${STREAM_PREFIX}_${stream}`);
    } catch (err) {
      // Stream might not exist, ignore
    }
  }
}