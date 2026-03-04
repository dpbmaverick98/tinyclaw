import { connect, NatsConnection, JetStreamClient, JetStreamManager, JSONCodec } from 'nats';
import { log } from '../lib/logging';

let nc: NatsConnection | null = null;
let js: JetStreamClient | null = null;
let jsm: JetStreamManager | null = null;

const jc = JSONCodec();

export async function initNATS(url = process.env.NATS_URL || 'localhost:4222'): Promise<void> {
  try {
    nc = await connect({ 
      servers: url,
      reconnect: true,
      maxReconnectAttempts: -1,
    });
    
    js = nc.jetstream();
    jsm = await js.jetstreamManager();
    
    log('INFO', `NATS connected to ${url}`);
    
    // Handle disconnections
    nc.closed().then(() => {
      log('WARN', 'NATS connection closed');
    });
    
  } catch (err) {
    log('ERROR', `NATS connection failed: ${(err as Error).message}`);
    throw err;
  }
}

export function getNATS(): { nc: NatsConnection; js: JetStreamClient; jsm: JetStreamManager } {
  if (!nc || !js || !jsm) {
    throw new Error('NATS not initialized. Call initNATS() first.');
  }
  return { nc, js, jsm };
}

export function getJSONCodec() {
  return jc;
}

export async function closeNATS(): Promise<void> {
  if (nc) {
    await nc.drain();
    nc = null;
    js = null;
    jsm = null;
    log('INFO', 'NATS connection closed');
  }
}

export function isNATSConnected(): boolean {
  return nc !== null && !nc.isClosed();
}