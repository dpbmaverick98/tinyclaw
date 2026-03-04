/**
 * In-memory response buffer
 *
 * Bridges the NATS durable response consumer (push) with the channel
 * clients' HTTP polling API (/api/responses/pending).
 *
 * Flow:
 *   NATS response stream
 *     → startResponseConsumer → deliverResponse (orchestrator)
 *       → addPendingResponse (here)
 *         → GET /api/responses/pending  (read)
 *           → POST /api/responses/:id/ack  (remove)
 */

import { ResponseMessage } from './types';

// conversationId → ResponseMessage, per channel
const buffer = new Map<string, Map<string, ResponseMessage>>();

export function addPendingResponse(response: ResponseMessage): void {
  const channel = response.channel ?? 'api';
  const id = response.conversationId ?? `${Date.now()}`;
  if (!buffer.has(channel)) {
    buffer.set(channel, new Map());
  }
  buffer.get(channel)!.set(id, response);
}

export function getPendingResponses(channel: string): ResponseMessage[] {
  return Array.from(buffer.get(channel)?.values() ?? []);
}

export function ackPendingResponse(conversationId: string): boolean {
  for (const channelBuffer of buffer.values()) {
    if (channelBuffer.delete(conversationId)) return true;
  }
  return false;
}
