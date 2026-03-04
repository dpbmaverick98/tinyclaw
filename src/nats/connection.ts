/**
 * NATS Connection Module
 * 
 * Manages the singleton connection to NATS server with automatic
 * reconnection and graceful shutdown support.
 * 
 * This replaces the SQLite database connection (db.ts) as the central
 * message queue backend.
 */

import { connect, NatsConnection, JetStreamClient, JetStreamManager, JSONCodec } from 'nats';
import { log } from '../lib/logging';

let nc: NatsConnection | null = null;
let js: JetStreamClient | null = null;
let jsm: JetStreamManager | null = null;

const jc = JSONCodec();

/**
 * Initialize NATS connection and JetStream
 * 
 * @param url - NATS server URL (default: from env or localhost:4222)
 * @throws Error if connection fails
 */
export async function initNATS(url = process.env.NATS_URL || 'localhost:4222'): Promise<void> {
  try {
    nc = await connect({ 
      servers: url,
      reconnect: true,
      maxReconnectAttempts: -1, // Infinite reconnects
      reconnectTimeWait: 1000,  // 1 second between attempts
    });
    
    js = nc.jetstream();
    jsm = await js.jetstreamManager();
    
    log('INFO', `NATS connected to ${url}`);
    
    // Handle disconnections gracefully
    nc.closed().then(() => {
      log('WARN', 'NATS connection closed');
      nc = null;
      js = null;
      jsm = null;
    });
    
  } catch (err) {
    log('ERROR', `NATS connection failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Get the NATS connection singleton
 * 
 * @throws Error if NATS not initialized
 */
export function getNATS(): { nc: NatsConnection; js: JetStreamClient; jsm: JetStreamManager } {
  if (!nc || !js || !jsm) {
    throw new Error('NATS not initialized. Call initNATS() first.');
  }
  return { nc, js, jsm };
}

/**
 * Get JSON codec for message encoding/decoding
 */
export function getJSONCodec() {
  return jc;
}

/**
 * Gracefully close NATS connection
 * Drains pending messages before closing
 */
export async function closeNATS(): Promise<void> {
  if (nc) {
    log('INFO', 'Draining NATS connection...');
    await nc.drain();
    nc = null;
    js = null;
    jsm = null;
    log('INFO', 'NATS connection closed');
  }
}

/**
 * Check if NATS is currently connected
 */
export function isNATSConnected(): boolean {
  return nc !== null && !nc.isClosed();
}

/**
 * Wait for NATS to be ready (with timeout)
 * 
 * @param timeoutMs - Maximum wait time in milliseconds
 * @returns true if connected, false if timeout
 */
export async function waitForNATS(timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isNATSConnected()) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}