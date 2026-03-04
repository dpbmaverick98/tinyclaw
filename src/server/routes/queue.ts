import { Hono } from 'hono';
import { log } from '../../lib/logging';
import { getNATS } from '../../nats/connection';
import { STREAM_PREFIX } from '../../nats/index';

/**
 * Create queue routes with NATS backend
 *
 * Note: This replaces the SQLite-based queue routes.
 * Response endpoints removed - channel clients now consume directly from NATS.
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

            // Get consumer info for all agents
            let pending = 0;
            let processing = 0;

            try {
                const consumers = await jsm.consumers.list(`${STREAM_PREFIX}_MESSAGES`);
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
                outgoing: 0, // Channel clients consume directly from NATS
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