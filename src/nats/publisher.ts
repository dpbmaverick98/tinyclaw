import { getNATS, getJSONCodec } from './connection';
import { getStreamPrefix } from './streams';
import { AgentMessage, ResponseMessage, EventMessage } from './types';
import { log } from '../lib/logging';

const jc = getJSONCodec();

export async function enqueueUserMessage(
  conversationId: string,
  content: string,
  firstAgent: string,
  channel: string,
  sender: string,
  senderId?: string
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  
  const message: AgentMessage = {
    conversationId,
    from: sender,
    content,
    history: [{ role: 'user', content, timestamp: Date.now() }],
    channel,
    sender,
    senderId,
  };
  
  await js.publish(`${prefix}.agent.${firstAgent}`, jc.encode(message));
  log('INFO', `Enqueued message for agent ${firstAgent}`);
}

export async function publishToAgent(
  agentId: string,
  message: AgentMessage
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  
  await js.publish(`${prefix}.agent.${agentId}`, jc.encode(message));
  log('INFO', `Published to agent ${agentId}`);
}

export async function publishResponse(
  conversationId: string,
  response: ResponseMessage
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  
  await js.publish(`${prefix}.responses.${conversationId}`, jc.encode(response));
  log('INFO', `Published response for conversation ${conversationId}`);
}

export async function publishEvent(
  eventType: EventMessage['type'],
  data: Record<string, unknown>
): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  
  const event: EventMessage = {
    type: eventType,
    timestamp: Date.now(),
    data,
  };
  
  await js.publish(`${prefix}.events.${eventType}`, jc.encode(event));
}