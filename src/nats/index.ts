/**
 * NATS Module Index
 *
 * Central export for all NATS-related functionality.
 */

// Connection
export { initNATS, getNATS, closeNATS, isNATSConnected, getJSONCodec, waitForNATS } from './connection';

// Streams
export { setupStreams, deleteStreams, getStreamPrefix } from './streams';

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

// Publisher (simplified - direct publish functions)
export {
  enqueueUserMessage,
  publishResponse,
  publishEvent,
} from './publisher';

// Workers
export { startAgentWorker } from './agent-worker';
export { startChannelConsumer } from './channel-consumer';