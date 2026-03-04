#!/usr/bin/env node
/**
 * TinyClaw NATS Orchestrator
 * 
 * Replaces queue-processor.ts with a NATS-based architecture.
 * 
 * Key differences from queue-processor:
 * - No SQLite database, uses NATS JetStream
 * - No manual locks, uses NATS consumer guarantees
 * - No pending counters, uses NATS message ack/nak
 * - Conversation state in NATS KV instead of in-memory Map
 * - Each agent has its own durable consumer
 * 
 * Architecture:
 * 1. Connect to NATS
 * 2. Setup JetStream streams
 * 3. Start API server
 * 4. Start durable consumers for each agent
 * 5. Start response consumers for each channel
 * 6. Handle graceful shutdown
 */

import fs from 'fs';
import path from 'path';
import { initNATS, closeNATS, isNATSConnected, setupStreams, startAgentConsumer, startResponseConsumer, publishEvent, initKV } from './nats';
import { getSettings, getAgents, getTeams, LOG_FILE, CHATS_DIR, FILES_DIR } from './lib/config';
import { log } from './lib/logging';
import { startApiServer } from './server';
import { loadPlugins } from './lib/plugins';
import { ResponseMessage } from './nats/types';

const API_PORT = parseInt(process.env.TINYCLAW_API_PORT || '3777', 10);

// Ensure directories exist
[FILES_DIR, path.dirname(LOG_FILE), CHATS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Log agent and team configuration
 */
function logAgentConfig(): void {
  const settings = getSettings();
  const agents = getAgents(settings);
  const teams = getTeams(settings);

  const agentCount = Object.keys(agents).length;
  log('INFO', `Loaded ${agentCount} agent(s):`);
  for (const [id, agent] of Object.entries(agents)) {
    log('INFO', `  ${id}: ${agent.name} [${agent.provider}/${agent.model}] cwd=${agent.working_directory}`);
  }

  const teamCount = Object.keys(teams).length;
  if (teamCount > 0) {
    log('INFO', `Loaded ${teamCount} team(s):`);
    for (const [id, team] of Object.entries(teams)) {
      log('INFO', `  ${id}: ${team.name} [agents: ${team.agents.join(', ')}] leader=${team.leader_agent}`);
    }
  }
}

/**
 * Deliver response to channel client
 * 
 * Note: Channel clients currently poll /api/responses/pending for responses.
 * This function logs the response for debugging. In future, this could
 * push directly to channel clients via WebSocket or webhook.
 */
async function deliverResponse(response: ResponseMessage): Promise<void> {
  log('INFO', `[${response.channel}] Response ready for ${response.sender} (${response.response.length} chars)`);
  
  // TODO: Implement direct push to channel clients
  // Options:
  // 1. WebSocket server for real-time push
  // 2. Webhook callbacks registered by channel clients
  // 3. Shared memory / pub-sub within process
  // 
  // For now, channel clients poll /api/responses/pending which reads from NATS
}

/**
 * Main orchestrator
 */
async function main(): Promise<void> {
  try {
    // Initialize NATS
    await initNATS(process.env.NATS_URL);
    
    if (!isNATSConnected()) {
      throw new Error('NATS connection failed');
    }
    
    // Setup JetStream streams
    await setupStreams();
    
    // Initialize KV store
    await initKV();
    
    // Load plugins
    await loadPlugins();
    
    // Get configuration
    const settings = getSettings();
    const agents = getAgents(settings);
    const teams = getTeams(settings);
    
    if (Object.keys(agents).length === 0) {
      log('WARN', 'No agents configured. Add agents via API or settings.');
    }
    
    // Start API server
    const apiServer = startApiServer();

    // Track running consumers for restart management
    const runningConsumers = new Map<string, boolean>();

    // Start agent consumers with proper restart tracking
    const consumerPromises: Promise<void>[] = [];

    async function startAgentConsumerWithRestart(agentId: string): Promise<void> {
      runningConsumers.set(`agent:${agentId}`, true);
      
      while (runningConsumers.get(`agent:${agentId}`)) {
        try {
          await startAgentConsumer(agentId);
          // If consumer returns normally, don't restart
          break;
        } catch (err) {
          log('ERROR', `Agent ${agentId} consumer crashed: ${(err as Error).message}`);
          log('INFO', `Restarting consumer for agent ${agentId} in 5s...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    for (const agentId of Object.keys(agents)) {
      consumerPromises.push(startAgentConsumerWithRestart(agentId));
    }

    // Start response consumers for enabled channels
    const enabledChannels = settings.channels?.enabled || ['telegram', 'discord', 'whatsapp', 'api'];
    
    async function startResponseConsumerWithRestart(channel: string): Promise<void> {
      runningConsumers.set(`response:${channel}`, true);
      
      while (runningConsumers.get(`response:${channel}`)) {
        try {
          await startResponseConsumer(channel, deliverResponse);
          break;
        } catch (err) {
          log('ERROR', `Response consumer for ${channel} crashed: ${(err as Error).message}`);
          log('INFO', `Restarting response consumer for ${channel} in 5s...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    for (const channel of enabledChannels) {
      consumerPromises.push(startResponseConsumerWithRestart(channel));
    }
    
    // Emit startup event
    publishEvent('processor_start', {
      agents: Object.keys(agents),
      teams: Object.keys(teams),
    });
    
    log('INFO', 'TinyClaw NATS orchestrator started');
    log('INFO', `API server on port ${API_PORT}`);
    logAgentConfig();
    
    // Keep running
    await Promise.all(consumerPromises);
    
  } catch (err) {
    log('ERROR', `Orchestrator failed: ${(err as Error).message}`);
    await closeNATS();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  log('INFO', 'Shutting down orchestrator (SIGINT)...');
  await closeNATS();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('INFO', 'Shutting down orchestrator (SIGTERM)...');
  await closeNATS();
  process.exit(0);
});

// Start
main();