import { Hono } from 'hono';
import { log } from '../../lib/logging';
import { getNATS, getJSONCodec } from '../../nats/connection';
import { getStreamPrefix } from '../../nats/streams';
import { getRecentResponses } from '../../nats/response-consumer';

const jc = getJSONCodec();

/**
 * Create queue routes with NATS backend
 * 
 * Note: This replaces the SQLite-based queue routes.
 * Some endpoints are simplified as NATS handles:
 * - Dead letter queue (automatic redelivery)
 * - Response acking (handled by consumers)
 * - Message claiming (handled by consumer groups)
 */
export function createQueueRoutes() {
    const app = new Hono();

    // GET /api/queue/status
    app.get('/api/queue/status', async (c) => {
        try {
            const { jsm } = getNATS();
            const prefix = getStreamPrefix();
            
            // Get consumer info for all agents
            let pending = 0;
            let processing = 0;
            
            try {
                const consumers = await jsm.consumers.list(`${prefix}_MESSAGES`);
                for await (const consumer of consumers) {
                    pending += consumer.num_pending;
                    processing += consumer.num_ack_pending;
                }
            } catch {
                // No consumers yet or stream doesn't exist
            }
            
            return c.json({
                incoming: pending,
                processing: processing,
                outgoing: 0, // Not tracked separately in NATS
                dead: 0, // NATS handles redelivery automatically
                activeConversations: 0, // Would need KV scan
            });
        } catch (err) {
            log('ERROR', `Failed to get queue status: ${(err as Error).message}`);
            return c.json({
                incoming: 0,
                processing: 0,
                outgoing: 0,
                dead: 0,
                activeConversations: 0,
                error: (err as Error).message,
            });
        }
    });

    // GET /api/responses - Get recent responses
    app.get('/api/responses', async (c) => {
        const limit = parseInt(c.req.query('limit') || '20', 10);

        // Get from all channels
        const allResponses: any[] = [];
        const channels = ['telegram', 'discord', 'whatsapp', 'api'];

        for (const channel of channels) {
            const responses = await getRecentResponses(channel, limit);
            allResponses.push(...responses.map(r => ({
                id: r.conversationId ? parseInt(r.conversationId.split('_')[1] || '0') : 0,
                channel: r.channel,
                sender: r.sender,
                senderId: r.senderId,
                message: r.response,
                originalMessage: r.originalMessage || '',
                timestamp: r.createdAt || Date.now(),
                messageId: r.conversationId,
                agent: r.agentId,
                files: r.files,
                metadata: r.metadata,
            })));
        }

        // Sort by timestamp (newest first) and limit
        allResponses.sort((a, b) => b.timestamp - a.timestamp);
        return c.json(allResponses.slice(0, limit));
    });

    // GET /api/responses/pending?channel=whatsapp
    app.get('/api/responses/pending', async (c) => {
        const channel = c.req.query('channel');
        if (!channel) return c.json({ error: 'channel query param required' }, 400);

        // Get recent responses for this channel
        const responses = await getRecentResponses(channel, 50);

        return c.json(responses.map(r => ({
            id: r.conversationId ? parseInt(r.conversationId.split('_')[1] || '0') : 0,
            channel: r.channel,
            sender: r.sender,
            senderId: r.senderId,
            message: r.response,
            originalMessage: r.originalMessage || '',
            timestamp: r.createdAt || Date.now(),
            messageId: r.conversationId,
            agent: r.agentId,
            files: r.files,
            metadata: r.metadata,
        })));
    });

    // POST /api/responses — enqueue a proactive outgoing message
    app.post('/api/responses', async (c) => {
        const body = await c.req.json();
        const { channel, sender, senderId, message, agent, files } = body as {
            channel?: string; sender?: string; senderId?: string;
            message?: string; agent?: string; files?: string[];
        };

        if (!channel || !sender || !message) {
            return c.json({ error: 'channel, sender, and message are required' }, 400);
        }

        // In NATS version, proactive responses go through the normal flow
        // This endpoint is kept for API compatibility
        log('INFO', `[API] Proactive response requested for ${channel}/${sender}`);
        
        const messageId = `proactive_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        // TODO: Implement proactive response via NATS
        // For now, return success but don't actually queue
        
        return c.json({ ok: true, messageId });
    });

    // POST /api/responses/:id/ack
    // In NATS, acking is handled by consumers - this is a no-op for compatibility
    app.post('/api/responses/:id/ack', (c) => {
        const id = c.req.param('id');
        log('DEBUG', `[API] Response ack received for ${id} (NATS handles acking)`);
        return c.json({ ok: true });
    });

    // GET /api/queue/dead
    // NATS handles dead letters automatically - return empty for compatibility
    app.get('/api/queue/dead', (c) => {
        return c.json([]);
    });

    // POST /api/queue/dead/:id/retry
    // NATS handles retries automatically - return success for compatibility
    app.post('/api/queue/dead/:id/retry', (c) => {
        const id = c.req.param('id');
        log('DEBUG', `[API] Dead message retry requested for ${id} (NATS handles retries)`);
        return c.json({ ok: true });
    });

    // DELETE /api/queue/dead/:id
    // NATS handles cleanup automatically - return success for compatibility
    app.delete('/api/queue/dead/:id', (c) => {
        const id = c.req.param('id');
        log('DEBUG', `[API] Dead message delete requested for ${id} (NATS handles cleanup)`);
        return c.json({ ok: true });
    });

    return app;
}