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

// Publisher
export {
  enqueueUserMessage,
  enqueueInternalMessage,
  publishResponse,
  publishEvent,
  initKV,
  saveConversationState,
  getConversationState,
  deleteConversationState,
} from './publisher';

// Consumers
export { startAgentConsumer } from './agent-consumer';
export { connectAndConsume } from './client-consumer';