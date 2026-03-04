/**
 * NATS Module Index
 *
 * Central export for all NATS-related functionality.
 */

// Connection
export { initNATS, getNATS, closeNATS, isNATSConnected, getJSONCodec, waitForNATS } from './connection';

// Stream prefix
export const STREAM_PREFIX = process.env.NATS_STREAM_PREFIX || 'tinyclaw';

// Types
export type {
  Message,
  AgentMessage,
  ResponseMessage,
  HandoffResult,
  EventType,
  EventMessage,
  ConversationState,
  AgentConsumerConfig,
} from './types';

// Publisher
export {
  enqueueUserMessage,
  publishResponse,
  publishEvent,
} from './publisher';

// Workers
export { startAgentWorker } from './agent-worker';
export { startChannelConsumer } from './channel-consumer';