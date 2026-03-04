import { Hono } from 'hono';
import { log } from '../../lib/logging';
import { enqueueUserMessage, publishEvent } from '../../nats/publisher';

const app = new Hono();

// POST /api/message
app.post('/api/message', async (c) => {
    const body = await c.req.json();
    const { message, agent, sender, senderId, channel, files, messageId: clientMessageId } = body as {
        message?: string; agent?: string; sender?: string; senderId?: string;
        channel?: string; files?: string[]; messageId?: string;
    };

    if (!message || typeof message !== 'string') {
        return c.json({ error: 'message is required' }, 400);
    }

    const resolvedChannel = channel || 'api';
    const resolvedSender = sender || 'API';
    const messageId = clientMessageId || `api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Prepend channel and sender context only when explicitly provided
    const fullMessage = (channel && sender) ? `[${channel}/${sender}]: ${message}` : message;

    // Route to agent or default
    const targetAgent = agent || 'default';

    await enqueueUserMessage(
        messageId,
        fullMessage,
        targetAgent,
        resolvedChannel,
        resolvedSender,
        senderId
    );

    log('INFO', `[API] Message enqueued for ${targetAgent}: ${message.substring(0, 60)}...`);
    
    publishEvent('message_enqueued', {
        messageId,
        agent: targetAgent,
        channel: resolvedChannel,
        sender: resolvedSender,
        message: message.substring(0, 120),
    });

    return c.json({ ok: true, messageId });
});

export default app;
