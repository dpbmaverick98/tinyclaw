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
import { initNATS, closeNATS, isNATSConnected, setupStreams, startAgentWorker, publishEvent } from './nats';
import { getSettings, getAgents, getTeams, LOG_FILE, CHATS_DIR, FILES_DIR } from './lib/config';
import { log } from './lib/logging';
import { startApiServer } from './server';
import { loadPlugins } from './lib/plugins';

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

    // Start agent workers with restart tracking
    const workerPromises: Promise<void>[] = [];

    async function startAgentWorkerWithRestart(agentId: string): Promise<void> {
      while (true) {
        try {
          await startAgentWorker(agentId);
          // If worker returns normally, don't restart
          break;
        } catch (err) {
          log('ERROR', `Agent ${agentId} worker crashed: ${(err as Error).message}`);
          log('INFO', `Restarting worker for agent ${agentId} in 5s...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    for (const agentId of Object.keys(agents)) {
      workerPromises.push(startAgentWorkerWithRestart(agentId));
    }

    // Note: Response consumers are now handled by channel clients directly
    // (telegram-client, discord-client, whatsapp-client connect to NATS themselves)

    // Emit startup event
    publishEvent('processor_start', {
      agents: Object.keys(agents),
      teams: Object.keys(teams),
    });

    log('INFO', 'TinyClaw NATS orchestrator started');
    log('INFO', `API server on port ${API_PORT}`);
    logAgentConfig();

    // Keep running
    await Promise.all(workerPromises);

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