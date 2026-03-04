# Queue System

TinyClaw uses **NATS JetStream** for message queuing. Messages flow through durable streams that persist until acknowledged, enabling reliable delivery across multiple channels and agents.

## Overview

The queue system acts as a central coordinator between:
- **Channel clients** (Discord, Telegram, WhatsApp) - produce messages via HTTP, consume responses via NATS
- **Orchestrator** - routes messages to appropriate agents
- **Agent consumers** - pull messages from NATS, process with AI
- **AI providers** (Claude, Codex) - generate responses

```
┌─────────────────────────────────────────────────────────────┐
│                     Message Channels                         │
│         (Discord, Telegram, WhatsApp, Heartbeat)            │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /api/message
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    NATS JetStream                            │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Messages Stream │  │ Responses Stream│                   │
│  │ (per-agent)     │  │ (per-channel)   │                   │
│  │                 │  │                 │                   │
│  │ tinyclaw.       │  │ tinyclaw.       │                   │
│  │ messages.sam    │  │ responses.telegram                 │
│  │ messages.wit    │  │ responses.discord                  │
│  │ ...             │  │ ...             │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
└───────────┼────────────────────┼─────────────────────────────┘
            │                    │
    ┌───────┴───────┐    ┌───────┴──────────┐
    │               │    │                    │
    ▼               ▼    ▼                    ▼
┌────────┐   ┌────────┐  ┌──────────┐  ┌──────────┐
│ Agent  │   │ Agent  │  │ Telegram │  │ Discord  │
│ Sam    │   │ Wit    │  │ Client   │  │ Client   │
│(pull)  │   │(pull)  │  │(pull)    │  │(pull)    │
└────┬───┘   └────┬───┘  └────┬─────┘  └────┬─────┘
     │            │           │             │
     ▼            ▼           ▼             ▼
  Publish     Publish     Send to       Send to
  response    response    Telegram      Discord
```

## Message Flow

### 1. Incoming Message (User → Agent)

```
User sends message
       ↓
Channel Client (Telegram/Discord/WhatsApp)
       ↓
POST /api/message (HTTP)
       ↓
Orchestrator receives message
       ↓
Route to appropriate agent
       ↓
Publish to tinyclaw.messages.{agentId} (NATS)
       ↓
Agent Consumer pulls message
       ↓
Process with AI (claude CLI)
       ↓
Publish response to tinyclaw.responses.{channel} (NATS)
       ↓
Channel Client pulls response
       ↓
Send to user
       ↓
Acknowledge message (removes from NATS)
```

### 2. Key Differences from SQLite

| Aspect | SQLite (Old) | NATS JetStream (New) |
|--------|-------------|---------------------|
| Storage | Local SQLite file | NATS server (can be remote) |
| Durability | Disk persistence | Stream persistence + replication |
| Concurrency | File locks | Durable consumers |
| Response delivery | HTTP polling (1s) | NATS push (immediate) |
| Retry logic | Manual (5 attempts) | Automatic with backoff |
| Dead letter | Manual queue | Automatic redelivery |
| Scaling | Single machine | Multi-machine capable |

## NATS Streams

### Messages Stream

Incoming messages for agents:
- **Subject**: `tinyclaw.messages.{agentId}`
- **Retention**: 24 hours or 10,000 messages
- **Consumers**: One durable consumer per agent
- **Ordering**: Sequential per agent (preserves conversation order)

### Responses Stream

Outgoing responses to channels:
- **Subject**: `tinyclaw.responses.{channel}`
- **Retention**: 1 hour or 1,000 messages
- **Consumers**: One durable consumer per channel client
- **Ordering**: Sequential per channel

### Events Stream

Real-time events for UI/heartbeat:
- **Subject**: `tinyclaw.events.{type}`
- **Retention**: 24 hours or 5,000 messages (memory only)
- **Usage**: UI updates, monitoring, logging

## Configuration

### Environment Variables

Channel clients and the orchestrator read these environment variables:

```bash
export NATS_URL="nats://localhost:4222"        # NATS server URL
export NATS_STREAM_PREFIX="tinyclaw"           # Stream name prefix
```

These are automatically set by `tinyclaw start` based on `settings.json`.

### Settings.json

```json
{
  "nats": {
    "port": 4222,
    "http_port": 8222
  }
}
```

## Consumer Behavior

### Agent Consumers

Each agent has a **durable pull consumer**:
- **Durable name**: `agent-{agentId}`
- **Max ack pending**: 1 (sequential processing)
- **Ack wait**: 5 minutes
- **Deliver policy**: All (process from beginning if new)

### Channel Consumers

Each channel client has a **durable pull consumer**:
- **Durable name**: `responses-{channel}`
- **Max ack pending**: 10 (allows some parallelism)
- **Ack wait**: 30 seconds
- **Ack policy**: Explicit (must ack after successful delivery)

## Acknowledgment

Messages are removed from NATS only after explicit acknowledgment:

```typescript
// Successful delivery
await sendToUser(response);
msg.ack();  // Removes from NATS

// Failed delivery
msg.nak();  // Redelivers later
```

This guarantees **at-least-once delivery** - messages are retried until successfully processed.

## Monitoring

### Check Stream Status

```bash
# Using tinyclaw CLI
tinyclaw status

# Check NATS specifically
tinyclaw nats status
```

### View Stream Info (with NATS CLI)

```bash
# List streams
nats stream ls

# Stream info
nats stream info tinyclaw_MESSAGES
nats stream info tinyclaw_RESPONSES

# Consumer info
nats consumer ls tinyclaw_MESSAGES
nats consumer info tinyclaw_MESSAGES agent-sam
```

### Logs

```bash
# NATS logs
tinyclaw nats logs -f

# Channel logs
tail -f ~/.tinyclaw/logs/telegram.log
tail -f ~/.tinyclaw/logs/discord.log
```

## Troubleshooting

### Messages Not Being Processed

1. Check NATS is running:
   ```bash
   tinyclaw nats status
   ```

2. Check agent consumers exist:
   ```bash
   nats consumer ls tinyclaw_MESSAGES
   ```

3. Check for errors in logs:
   ```bash
   tinyclaw logs
   ```

### Messages Stuck in Queue

If messages aren't being acknowledged:

1. Check agent is running:
   ```bash
   tinyclaw status
   ```

2. Check agent logs for errors:
   ```bash
   tail -f ~/.tinyclaw/logs/orchestrator.log
   ```

3. Consumer might be stuck - restart orchestrator:
   ```bash
   tinyclaw restart
   ```

### High Memory Usage

NATS JetStream keeps messages in memory + disk:

- **Messages stream**: Max 10,000 messages or 24 hours
- **Responses stream**: Max 1,000 messages or 1 hour
- **Events stream**: Max 5,000 messages or 24 hours (memory only)

Old messages are automatically purged.

## Performance

- **Throughput**: Millions of messages/second (NATS capability)
- **Latency**: Sub-millisecond for local NATS
- **Response time**: <100ms (vs 1-2s with HTTP polling)
- **Memory**: ~50MB base + stream storage

## Further Reading

- [NATS Documentation](https://docs.nats.io/)
- [JetStream Concepts](https://docs.nats.io/nats-concepts/jetstream)
- [NATS Migration Guide](NATS_MIGRATION.md)