import { Hono } from 'hono';
import { log, emitEvent } from '../../lib/logging';
import { enqueueUserMessage } from '../../nats/publisher';
import { getSettings, getAgents, getTeams } from '../../lib/config';
import { parseAgentRouting } from '../../lib/routing';

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

    // Load settings for routing resolution
    const settings = getSettings();
    const agents = getAgents(settings);
    const teams = getTeams(settings);

    // Resolve routing: handle team names, agent display names, and @prefix
    let targetAgent: string;
    let messageBody: string;

    if (agent && agents[agent]) {
        // Direct agent ID provided
        targetAgent = agent;
        messageBody = message;
    } else {
        // Parse @agent or @team prefix from message, or use provided agent param
        const routing = parseAgentRouting(message, agents, teams);
        targetAgent = routing.agentId;
        messageBody = routing.message;

        // If agent param was a team name, resolve to leader
        if (agent && teams[agent]) {
            targetAgent = teams[agent].leader_agent;
            messageBody = message; // Don't strip prefix if agent param was explicit team
        } else if (agent && !agents[agent]) {
            // Check if agent param matches an agent name
            for (const [id, config] of Object.entries(agents)) {
                if (config.name.toLowerCase() === agent.toLowerCase()) {
                    targetAgent = id;
                    break;
                }
            }
        }
    }

    // Append channel and sender context as a signature
    const fullMessage = (channel && sender) ? `${messageBody}\n\n— ${sender} via ${channel}` : messageBody;

    await enqueueUserMessage(
        messageId,
        fullMessage,
        targetAgent,
        resolvedChannel,
        resolvedSender,
        senderId,
        files
    );

    log('INFO', `[API] Message enqueued for ${targetAgent}: ${messageBody.substring(0, 60)}...`);
    emitEvent('message_enqueued', {
        messageId,
        agent: targetAgent,
        channel: resolvedChannel,
        sender: resolvedSender,
        message: messageBody.substring(0, 120),
    });

    return c.json({ ok: true, messageId });
});

export default app;
