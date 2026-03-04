import { Hono } from 'hono';
import { getNATS, getJSONCodec } from '../../nats/connection';
import { getStreamPrefix } from '../../nats/streams';
import { log } from '../../lib/logging';

const jc = getJSONCodec();

export function createQueueRoutes() {
    const app = new Hono();

    // GET /api/queue/status
    app.get('/api/queue/status', async (c) => {
        try {
            const { jsm } = getNATS();
            const prefix = getStreamPrefix();
            
            // Get consumer info for all agents
            const consumers = await jsm.consumers.list(`${prefix}_CONVERSATIONS`);
            let pending = 0;
            let processing = 0;
            
            for await (const consumer of consumers) {
                pending += consumer.num_pending;
                processing += consumer.num_ack_pending;
            }
            
            return c.json({
                incoming: pending,
                processing: processing,
                outgoing: 0, // Not tracked separately in NATS
                dead: 0, // NATS handles redelivery automatically
                activeConversations: 0, // Would need KV store
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

    // GET /api/responses - simplified, returns empty for now
    app.get('/api/responses', (c) => {
        // TODO: Implement response tracking via NATS
        return c.json([]);
    });

    // GET /api/responses/pending?channel=whatsapp
    app.get('/api/responses/pending', (c) => {
        const channel = c.req.query('channel');
        if (!channel) return c.json({ error: 'channel query param required' }, 400);
        
        // TODO: Implement response tracking via NATS
        return c.json([]);
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

        // TODO: Implement proactive response via NATS
        log('INFO', `[API] Proactive response requested for ${channel}/${sender}`);
        return c.json({ ok: true, messageId: `proactive_${Date.now()}` });
    });

    // POST /api/responses/:id/ack - no-op in NATS (auto-ack)
    app.post('/api/responses/:id/ack', (c) => {
        return c.json({ ok: true });
    });

    // POST /api/responses/:id/claim - no-op in NATS
    app.post('/api/responses/:id/claim', (c) => {
        return c.json({ success: true });
    });

    // POST /api/responses/:id/unclaim - no-op in NATS
    app.post('/api/responses/:id/unclaim', (c) => {
        return c.json({ success: true });
    });

    // GET /api/queue/dead - empty in NATS (no dead messages)
    app.get('/api/queue/dead', (c) => {
        return c.json([]);
    });

    // POST /api/queue/dead/:id/retry - no-op in NATS
    app.post('/api/queue/dead/:id/retry', (c) => {
        return c.json({ ok: true });
    });

    // DELETE /api/queue/dead/:id - no-op in NATS
    app.delete('/api/queue/dead/:id', (c) => {
        return c.json({ ok: true });
    });

    return app;
}