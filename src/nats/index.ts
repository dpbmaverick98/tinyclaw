// NATS module exports
export { initNATS, getNATS, closeNATS, isNATSConnected, getJSONCodec } from './connection';
export { setupStreams, getStreamPrefix } from './streams';
export { startAgentConsumer } from './agent-consumer';
export { enqueueUserMessage, publishToAgent, publishResponse, publishEvent } from './publisher';
export type { 
  Message, 
  AgentMessage, 
  ResponseMessage, 
  HandoffResult, 
  EventType, 
  EventMessage 
} from './types';