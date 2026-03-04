/**
 * Agent Consumer Module
 * 
 * Creates durable consumers for each agent to process messages.
 * This is the core of the NATS-based multi-agent system.
 * 
 * Key design: Each agent has its own durable consumer with max_ack_pending=1.
 * This guarantees sequential message processing per agent without locks.
 */

import { getNATS, getJSONCodec } from './connection';
import { getStreamPrefix } from './streams';
import { AgentMessage, ResponseMessage, HandoffResult, Message } from './types';
import { invokeAgent } from '../lib/invoke';
import { getSettings, getAgents, getTeams } from '../lib/config';
import { log } from '../lib/logging';
import { enqueueInternalMessage, publishResponse, publishEvent, saveConversationState, getConversationState } from './publisher';
import { extractTeammateMentions, findTeamForAgent } from '../lib/routing';
import { runIncomingHooks, runOutgoingHooks } from '../lib/plugins';
import { handleLongResponse, collectFiles } from '../lib/response';
import fs from 'fs';
import path from 'path';
import { CHATS_DIR } from '../lib/config';

const jc = getJSONCodec();

/**
 * Start a durable consumer for an agent
 * 
 * @param agentId - The agent ID to consume for
 * @returns Promise that resolves when consumer stops (shouldn't happen in normal operation)
 */
export async function startAgentConsumer(agentId: string): Promise<void> {
  const { js } = getNATS();
  const prefix = getStreamPrefix();
  const settings = getSettings();
  const agents = getAgents(settings);
  const teams = getTeams(settings);
  const agent = agents[agentId];
  
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }
  
  const subject = `${prefix}.messages.${agentId}`;
  const durableName = `agent-${agentId}`;
  
  log('INFO', `Starting consumer for agent ${agentId} on ${subject}`);
  
  // Create durable consumer
  // max_ack_pending: 1 ensures only one message processed at a time per agent
  // This eliminates race conditions without explicit locks
  const sub = await js.subscribe(subject, {
    config: {
      durable_name: durableName,
      deliver_policy: 'all',
      ack_policy: 'explicit',
      max_ack_pending: 1,
      ack_wait: 10 * 60 * 1000 * 1000000, // 10 min in nanoseconds
    },
  });
  
  log('INFO', `Agent ${agentId} consumer started (durable: ${durableName})`);
  
  // Process messages forever
  for await (const msg of sub) {
    try {
      await processAgentMessage(msg.data, agentId, agents, teams, settings);
      msg.ack();
    } catch (err) {
      log('ERROR', `[${agentId}] Processing failed: ${(err as Error).message}`);
      // Negative ack - message will be redelivered
      msg.nak();
    }
  }
}

/**
 * Process a single message for an agent
 */
async function processAgentMessage(
  data: Uint8Array,
  agentId: string,
  agents: Record<string, any>,
  teams: Record<string, any>,
  settings: any
): Promise<void> {
  const msg = jc.decode(data) as AgentMessage;
  const agent = agents[agentId];
  const workspacePath = settings?.workspace?.path || path.join(require('os').homedir(), 'tinyclaw-workspace');
  
  log('INFO', `[${agentId}] Processing message from ${msg.from} in conversation ${msg.conversationId}`);
  
  // Emit event for UI
  publishEvent('chain_step_start', {
    agentId,
    agentName: agent.name,
    fromAgent: msg.from,
    conversationId: msg.conversationId,
  });
  
  // Determine team context
  let teamContext = findTeamForAgent(agentId, teams);
  
  // Get or create conversation state
  let conv = await getConversationState(msg.conversationId);
  if (!conv) {
    conv = {
      id: msg.conversationId,
      channel: msg.channel || 'api',
      sender: msg.sender || 'Unknown',
      senderId: msg.senderId,
      originalMessage: msg.content,
      messageId: msg.conversationId,
      pending: 1,
      responses: [],
      files: msg.files || [],
      totalMessages: 0,
      maxMessages: 50,
      teamContext: teamContext ? {
        teamId: teamContext.teamId,
        teamName: teamContext.team.name,
        leaderAgent: teamContext.team.leader_agent,
        agents: teamContext.team.agents,
      } : undefined,
      startTime: Date.now(),
      pendingAgents: [agentId],
    };
  }
  
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
      agent.working_directory || `${workspacePath}/${agentId}`,
      false, // shouldReset
      agents,
      teams
    );
  } catch (error) {
    const provider = agent.provider || 'anthropic';
    const providerLabel = provider === 'openai' ? 'Codex' : 'Claude';
    log('ERROR', `${providerLabel} error (agent: ${agentId}): ${(error as Error).message}`);
    response = "Sorry, I encountered an error processing your request.";
  }
  
  log('INFO', `[${agentId}] Generated response (${response.length} chars)`);
  
  // Emit event
  publishEvent('chain_step_done', {
    agentId,
    agentName: agent.name,
    responseLength: response.length,
    conversationId: msg.conversationId,
  });
  
  // Update conversation state
  conv.responses.push({ agentId, response });
  conv.totalMessages++;
  conv.pendingAgents = conv.pendingAgents.filter(a => a !== agentId);
  collectFiles(response, new Set(conv.files));
  
  // Check for teammate mentions
  const mentions = teamContext 
    ? extractTeammateMentions(response, agentId, teamContext.teamId, teams, agents)
    : [];
  
  if (mentions.length > 0 && conv.totalMessages < conv.maxMessages) {
    // Handoff to teammates
    conv.pending += mentions.length;
    
    for (const mention of mentions) {
      conv.pendingAgents.push(mention.teammateId);
      
      log('INFO', `[${agentId}] Handoff to ${mention.teammateId}`);
      publishEvent('chain_handoff', {
        fromAgent: agentId,
        toAgent: mention.teammateId,
        conversationId: msg.conversationId,
      });
      
      const updatedHistory: Message[] = [
        ...msg.history,
        { role: 'agent', agentId, content: response, timestamp: Date.now() }
      ];
      
      await enqueueInternalMessage(
        msg.conversationId,
        agentId,
        mention.teammateId,
        mention.message,
        updatedHistory,
        {
          channel: msg.channel || 'api',
          sender: msg.sender || 'Unknown',
          senderId: msg.senderId,
          messageId: msg.conversationId,
        }
      );
    }
    
    // Save state for tracking
    conv.pending--;
    await saveConversationState(conv);
    
  } else {
    // No handoffs - check if conversation complete
    conv.pending--;
    
    if (conv.pending <= 0) {
      // Conversation complete
      await completeConversation(conv, agents);
    } else {
      // More pending branches
      await saveConversationState(conv);
    }
  }
}

/**
 * Build prompt from conversation history
 */
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

/**
 * Complete a conversation and send final response
 */
async function completeConversation(
  conv: any,
  agents: Record<string, any>
): Promise<void> {
  log('INFO', `Conversation ${conv.id} complete — ${conv.responses.length} response(s)`);
  
  publishEvent('team_chain_end', {
    teamId: conv.teamContext?.teamId,
    totalSteps: conv.responses.length,
    agents: conv.responses.map((r: any) => r.agentId),
  });
  
  // Aggregate responses
  let finalResponse: string;
  if (conv.responses.length === 1) {
    finalResponse = conv.responses[0].response;
  } else {
    finalResponse = conv.responses
      .map((step: any) => `@${step.agentId}: ${step.response}`)
      .join('\n\n------\n\n');
  }
  
  // Save chat history
  await saveChatHistory(conv, agents);
  
  // Process response
  finalResponse = finalResponse.trim();
  const outboundFiles = new Set(conv.files);
  collectFiles(finalResponse, outboundFiles);
  const files = Array.from(outboundFiles);
  
  if (files.length > 0) {
    finalResponse = finalResponse.replace(/\[send_file:\s*[^\]]+\]/g, '').trim();
  }
  
  // Convert [@agent: ...] tags
  finalResponse = finalResponse.replace(/\[@(\S+?):\s*([\s\S]*?)\]/g, '→ @$1: $2').trim();
  
  // Run outgoing hooks
  const { text: hookedResponse, metadata } = await runOutgoingHooks(finalResponse, {
    channel: conv.channel,
    sender: conv.sender,
    messageId: conv.messageId,
    originalMessage: conv.originalMessage,
  });
  
  // Handle long responses
  const { message: responseMessage, files: allFiles } = handleLongResponse(hookedResponse, files);
  
  // Publish response
  const responseMsg: ResponseMessage = {
    conversationId: conv.id,
    response: responseMessage,
    history: [], // Could populate from conv.responses
    agentId: conv.responses[conv.responses.length - 1]?.agentId || 'unknown',
    channel: conv.channel,
    sender: conv.sender,
    senderId: conv.senderId,
    files: allFiles.length > 0 ? allFiles : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
  
  await publishResponse(conv.id, responseMsg);
  
  log('INFO', `✓ Response ready [${conv.channel}] ${conv.sender} (${responseMessage.length} chars)`);
  
  publishEvent('response_ready', {
    channel: conv.channel,
    sender: conv.sender,
    responseLength: responseMessage.length,
    messageId: conv.messageId,
  });
  
  // Cleanup
  const { deleteConversationState } = await import('./publisher');
  await deleteConversationState(conv.id);
}

/**
 * Save chat history to file
 */
async function saveChatHistory(conv: any, agents: Record<string, any>): Promise<void> {
  if (!conv.teamContext) return;
  
  try {
    const teamChatsDir = path.join(CHATS_DIR, conv.teamContext.teamId);
    if (!fs.existsSync(teamChatsDir)) {
      fs.mkdirSync(teamChatsDir, { recursive: true });
    }
    
    const lines: string[] = [];
    lines.push(`# Team Conversation: ${conv.teamContext.teamName} (@${conv.teamContext.teamId})`);
    lines.push(`**Date:** ${new Date().toISOString()}`);
    lines.push(`**Channel:** ${conv.channel} | **Sender:** ${conv.sender}`);
    lines.push(`**Messages:** ${conv.totalMessages}`);
    lines.push('');
    lines.push('------');
    lines.push('');
    lines.push('## User Message');
    lines.push('');
    lines.push(conv.originalMessage);
    lines.push('');
    
    for (const step of conv.responses) {
      const stepAgent = agents[step.agentId];
      const stepLabel = stepAgent ? `${stepAgent.name} (@${step.agentId})` : `@${step.agentId}`;
      lines.push('------');
      lines.push('');
      lines.push(`## ${stepLabel}`);
      lines.push('');
      lines.push(step.response);
      lines.push('');
    }
    
    const now = new Date();
    const dateTime = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    fs.writeFileSync(path.join(teamChatsDir, `${dateTime}.md`), lines.join('\n'));
    log('INFO', 'Chat history saved');
  } catch (e) {
    log('ERROR', `Failed to save chat history: ${(e as Error).message}`);
  }
}