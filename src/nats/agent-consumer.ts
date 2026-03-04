import { getNATS, getJSONCodec } from './connection';
import { getStreamPrefix } from './streams';
import { AgentMessage, ResponseMessage, HandoffResult, Message } from './types';
import { invokeAgent } from '../lib/invoke';
import { getSettings, getAgents, getTeams } from '../lib/config';
import { log } from '../lib/logging';
import { publishToAgent, publishResponse, publishEvent } from './publisher';

const jc = getJSONCodec();

export async function startAgentConsumer(agentId: string): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  const settings = getSettings();
  const agents = getAgents(settings);
  const agent = agents[agentId];
  
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }
  
  const subject = `${prefix}.agent.${agentId}`;
  const consumerName = `${prefix}_${agentId}`;
  
  log('INFO', `Starting consumer for agent ${agentId} on ${subject}`);
  
  const sub = await js.subscribe(subject, {
    config: {
      durable_name: consumerName,
      deliver_policy: 'all',
      ack_policy: 'explicit',
      max_ack_pending: 1, // Process one message at a time
      ack_wait: 10 * 60 * 1000 * 1000000, // 10 min in nanoseconds
    },
  });
  
  log('INFO', `Agent ${agentId} consumer started`);
  
  for await (const msg of sub) {
    try {
      const data = jc.decode(msg.data) as AgentMessage;
      
      log('INFO', `[${agentId}] Processing message from ${data.from} in conversation ${data.conversationId}`);
      
      // Emit event for UI
      publishEvent('chain_step_start', {
        agentId,
        agentName: agent.name,
        fromAgent: data.from,
        conversationId: data.conversationId,
      });
      
      // Build prompt with full history
      const prompt = buildPrompt(data.history, data.content);
      
      // Invoke the agent
      const response = await invokeAgent(
        agent,
        agentId,
        prompt,
        agent.working_directory || `${settings.workspace?.path}/${agentId}`,
        false, // shouldReset
        agents,
        getTeams(settings)
      );
      
      log('INFO', `[${agentId}] Generated response (${response.length} chars)`);
      
      // Emit event for UI
      publishEvent('chain_step_done', {
        agentId,
        agentName: agent.name,
        responseLength: response.length,
        conversationId: data.conversationId,
      });
      
      // Parse handoff
      const handoff = parseHandoff(response);
      
      if (handoff) {
        // Handoff to teammate
        log('INFO', `[${agentId}] Handoff to ${handoff.agentId}`);
        
        publishEvent('chain_handoff', {
          fromAgent: agentId,
          toAgent: handoff.agentId,
          conversationId: data.conversationId,
        });
        
        const updatedHistory: Message[] = [
          ...data.history,
          { role: 'agent', agentId, content: response, timestamp: Date.now() }
        ];
        
        await publishToAgent(handoff.agentId, {
          conversationId: data.conversationId,
          from: agentId,
          content: handoff.message,
          history: updatedHistory,
          channel: data.channel,
          sender: data.sender,
          senderId: data.senderId,
        });
      } else {
        // Complete - send response to user
        log('INFO', `[${agentId}] Conversation ${data.conversationId} completed`);
        
        publishEvent('team_chain_end', {
          teamId: 'default', // TODO: Get actual team
          conversationId: data.conversationId,
        });
        
        const responseMsg: ResponseMessage = {
          conversationId: data.conversationId,
          response,
          history: [
            ...data.history,
            { role: 'agent', agentId, content: response, timestamp: Date.now() }
          ],
          agentId,
          channel: data.channel,
          sender: data.sender,
        };
        
        await publishResponse(data.conversationId, responseMsg);
      }
      
      // Acknowledge message processing complete
      msg.ack();
      
    } catch (err) {
      log('ERROR', `[${agentId}] Processing failed: ${(err as Error).message}`);
      // Negative ack - message will be redelivered
      msg.nak();
    }
  }
}

function buildPrompt(history: Message[], currentContent: string): string {
  const lines: string[] = [];
  
  for (const msg of history) {
    if (msg.role === 'user') {
      lines.push(`User: ${msg.content}`);
    } else if (msg.role === 'agent' && msg.agentId) {
      lines.push(`${msg.agentId}: ${msg.content}`);
    }
  }
  
  lines.push(`User: ${currentContent}`);
  
  return lines.join('\n\n');
}

function parseHandoff(response: string): HandoffResult | null {
  // Match [@agentId: message] pattern
  const match = response.match(/\[@(\w+):\s*([\s\S]*?)\]/);
  if (!match) return null;
  
  return {
    agentId: match[1].toLowerCase(),
    message: match[2].trim(),
  };
}