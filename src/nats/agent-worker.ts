/**
 * Agent Worker Module
 *
 * Simplified agent message processing using pure message passing.
 * No shared state, no KV, no CAS - each message carries full context.
 *
 * Handoff pattern:
 * 1. Agent A processes message
 * 2. Agent A detects @B mention in response
 * 3. Agent A publishes NEW message to B's subject with updated history
 * 4. Agent B processes as fresh message with full context
 *
 * No conversation state is shared - it's all in the message history.
 */

import { getNATS, getJSONCodec } from './connection';
import { getStreamPrefix } from './streams';
import { AgentMessage, ResponseMessage } from './types';
import { invokeAgent } from '../lib/invoke';
import { getSettings, getAgents, getTeams } from '../lib/config';
import { log } from '../lib/logging';
import { extractTeammateMentions, findTeamForAgent } from '../lib/routing';
import { runIncomingHooks, runOutgoingHooks } from '../lib/plugins';
import { handleLongResponse, collectFiles } from '../lib/response';
import { DeliverPolicy, AckPolicy } from 'nats';

const jc = getJSONCodec();

/**
 * Start processing messages for an agent.
 *
 * Uses NATS built-in reconnection. The consume() iterator:
 * 1. Processes messages sequentially (max_ack_pending: 1)
 * 2. Auto-recovers on NATS reconnect
 * 3. Resumes from last unacknowledged message
 *
 * @param agentId - Agent ID to process messages for
 */
export async function startAgentWorker(agentId: string): Promise<void> {
  const { js, jsm } = getNATS();
  const prefix = getStreamPrefix();
  const settings = getSettings();
  const agents = getAgents(settings);
  const teams = getTeams(settings);
  const agent = agents[agentId];

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const streamName = `${prefix}_MESSAGES`;
  const subject = `${prefix}.messages.${agentId}`;
  const durableName = `agent-${agentId}`;

  log('INFO', `Starting worker for agent ${agentId}`);

  // Create durable consumer - idempotent, ok if already exists
  await jsm.consumers.add(streamName, {
    durable_name: durableName,
    deliver_policy: DeliverPolicy.All,
    ack_policy: AckPolicy.Explicit,
    max_ack_pending: 1,  // Sequential processing per agent
    ack_wait: 10 * 60 * 1000 * 1000000, // 10 min
    filter_subject: subject,
  }).catch(err => {
    if (!err.message?.includes('already exists')) throw err;
  });

  const consumer = await js.consumers.get(streamName, durableName);
  const messages = await consumer.consume();

  log('INFO', `Agent ${agentId} worker started`);

  // Process messages forever
  for await (const msg of messages) {
    try {
      await processMessage(msg.data, agentId, agent, agents, teams, settings, js, prefix);
      msg.ack();
    } catch (err) {
      log('ERROR', `[${agentId}] Processing failed: ${(err as Error).message}`);
      msg.nak();
    }
  }
}

/**
 * Process a single message.
 *
 * Handoff logic: If response contains @mentions, publish new messages
 * to those agents with updated history. No shared state needed.
 */
async function processMessage(
  data: Uint8Array,
  agentId: string,
  agent: any,
  agents: Record<string, any>,
  teams: Record<string, any>,
  settings: any,
  js: any,
  prefix: string
): Promise<void> {
  const msg = jc.decode(data) as AgentMessage;
  const workspacePath = settings?.workspace?.path || require('os').homedir();

  log('INFO', `[${agentId}] Processing message from ${msg.from}`);

  // Build prompt from history
  const prompt = buildPrompt(msg.history, msg.content);

  // Run incoming hooks
  const { text: hookedPrompt } = await runIncomingHooks(prompt, {
    channel: msg.channel || 'api',
    sender: msg.sender || 'Unknown',
    messageId: msg.conversationId,
    originalMessage: msg.content,
  });

  // Invoke agent
  let response: string;
  try {
    response = await invokeAgent(
      agent,
      agentId,
      hookedPrompt,
      workspacePath,
      false,
      agents,
      teams
    );
  } catch (error) {
    const provider = agent.provider || 'anthropic';
    log('ERROR', `${provider} error (agent: ${agentId}): ${(error as Error).message}`);
    response = "Sorry, I encountered an error processing your request.";
  }

  log('INFO', `[${agentId}] Generated response (${response.length} chars)`);

  // Check for teammate mentions
  const teamContext = findTeamForAgent(agentId, teams);
  const mentions = teamContext
    ? extractTeammateMentions(response, agentId, teamContext.teamId, teams, agents)
    : [];

  if (mentions.length > 0) {
    // Handoff to teammates - publish new messages with full context
    for (const mention of mentions) {
      log('INFO', `[${agentId}] Handoff to ${mention.teammateId}`);

      const updatedHistory = [
        ...msg.history,
        { role: 'agent', agentId, content: response, timestamp: Date.now() }
      ];

      const handoffMsg: AgentMessage = {
        conversationId: msg.conversationId,
        from: agentId,
        content: mention.message,
        history: updatedHistory,
        channel: msg.channel,
        sender: msg.sender,
        senderId: msg.senderId,
      };

      await js.publish(`${prefix}.messages.${mention.teammateId}`, jc.encode(handoffMsg));
    }
  } else {
    // No handoffs - publish final response
    const responseMsg: ResponseMessage = {
      conversationId: msg.conversationId,
      response: response.trim(),
      history: [],
      agentId,
      channel: msg.channel || 'api',
      sender: msg.sender || 'Unknown',
      senderId: msg.senderId,
      originalMessage: msg.content,
      createdAt: Date.now(),
    };

    await js.publish(`${prefix}.responses.${responseMsg.channel}`, jc.encode(responseMsg));
    log('INFO', `✓ Response published for ${msg.conversationId}`);
  }
}

/**
 * Build prompt from conversation history
 */
function buildPrompt(history: Array<{role: string; agentId?: string; content: string}>, currentContent: string): string {
  const lines: string[] = [];

  for (const h of history) {
    if (h.role === 'user') {
      lines.push(`User: ${h.content}`);
    } else if (h.role === 'agent' && h.agentId) {
      lines.push(`${h.agentId}: ${h.content}`);
    }
  }

  // Add current message if not already last
  const last = history[history.length - 1];
  if (!last || last.role !== 'user' || last.content !== currentContent) {
    lines.push(`User: ${currentContent}`);
  }

  return lines.join('\n\n');
}
