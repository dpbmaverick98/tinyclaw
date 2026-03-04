import { getNATS } from './connection';
import { log } from '../lib/logging';

const STREAM_PREFIX = process.env.NATS_STREAM_PREFIX || 'tinyclaw';

export async function setupStreams(): Promise<void> {
  const { jsm } = getNATS();
  
  // CONVERSATIONS stream - for new conversations and replies
  try {
    await jsm.streams.add({
      name: `${STREAM_PREFIX}_CONVERSATIONS`,
      subjects: [`${STREAM_PREFIX}.conversations.*`, `${STREAM_PREFIX}.agent.*`],
      retention: 'limits',
      max_msgs: 10000,
      max_age: 24 * 60 * 60 * 1000 * 1000000, // 24h in nanoseconds
      storage: 'file',
    });
    log('INFO', 'Created CONVERSATIONS stream');
  } catch (err) {
    if ((err as Error).message.includes('already exists')) {
      log('INFO', 'CONVERSATIONS stream already exists');
    } else {
      throw err;
    }
  }
  
  // RESPONSES stream - for final responses to users
  try {
    await jsm.streams.add({
      name: `${STREAM_PREFIX}_RESPONSES`,
      subjects: [`${STREAM_PREFIX}.responses.*`],
      retention: 'limits',
      max_msgs: 1000,
      max_age: 60 * 60 * 1000 * 1000000, // 1h in nanoseconds
      storage: 'file',
    });
    log('INFO', 'Created RESPONSES stream');
  } catch (err) {
    if ((err as Error).message.includes('already exists')) {
      log('INFO', 'RESPONSES stream already exists');
    } else {
      throw err;
    }
  }
  
  // EVENTS stream - for UI real-time updates
  try {
    await jsm.streams.add({
      name: `${STREAM_PREFIX}_EVENTS`,
      subjects: [`${STREAM_PREFIX}.events.*`],
      retention: 'limits',
      max_msgs: 5000,
      max_age: 24 * 60 * 60 * 1000 * 1000000, // 24h in nanoseconds
      storage: 'memory', // Events are ephemeral
    });
    log('INFO', 'Created EVENTS stream');
  } catch (err) {
    if ((err as Error).message.includes('already exists')) {
      log('INFO', 'EVENTS stream already exists');
    } else {
      throw err;
    }
  }
}

export function getStreamPrefix(): string {
  return STREAM_PREFIX;
}