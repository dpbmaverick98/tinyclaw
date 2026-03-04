#!/usr/bin/env node
/**
 * TinyClaw NATS Orchestrator
 * 
 * Replaces queue-processor.ts with a simpler NATS-based architecture:
 * - Each agent has a durable consumer
 * - Messages flow through NATS JetStream
 * - No SQLite, no locks, no pending counters
 */

import { initNATS, closeNATS, isNATSConnected } from './nats/connection';
import { setupStreams } from './nats/streams';
import { startAgentConsumer } from './nats/agent-consumer';
import { publishEvent } from './nats/publisher';
import { getSettings, getAgents, getTeams } from './lib/config';
import { log } from './lib/logging';
import { startApiServer } from './server';
import { loadPlugins } from './lib/plugins';

async function main() {
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
    const server = startApiServer(new Map()); // Empty map - no in-memory conversations needed
    
    // Start consumers for all agents
    const consumerPromises: Promise<void>[] = [];
    
    for (const agentId of Object.keys(agents)) {
      const promise = startAgentConsumer(agentId).catch(err => {
        log('ERROR', `Agent ${agentId} consumer crashed: ${err.message}`);
        // Restart consumer after delay
        setTimeout(() => {
          log('INFO', `Restarting consumer for agent ${agentId}`);
          startAgentConsumer(agentId).catch(e => 
            log('ERROR', `Agent ${agentId} restart failed: ${e.message}`)
          );
        }, 5000);
      });
      
      consumerPromises.push(promise);
    }
    
    // Emit startup event
    publishEvent('processor_start', {
      agents: Object.keys(agents),
      teams: Object.keys(teams),
    });
    
    log('INFO', 'TinyClaw NATS orchestrator started');
    log('INFO', `Agents: ${Object.keys(agents).join(', ') || 'none'}`);
    log('INFO', `Teams: ${Object.keys(teams).join(', ') || 'none'}`);
    
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
  log('INFO', 'Shutting down orchestrator...');
  await closeNATS();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('INFO', 'Shutting down orchestrator...');
  await closeNATS();
  process.exit(0);
});

main();