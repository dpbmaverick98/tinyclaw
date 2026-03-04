# NATS Migration Guide

This document describes the migration from SQLite to NATS JetStream for TinyClaw's message queue.

## Overview

TinyClaw has migrated from SQLite (`better-sqlite3`) to NATS JetStream for message queuing. This change:

- **Fixes race conditions** in multi-agent handoffs (Wit→Sam bug)
- **Improves reliability** with durable message streams
- **Enables horizontal scaling** (agents can run on different machines)
- **Simplifies architecture** by eliminating manual locks and counters
- **CLI-managed NATS** - No Docker or manual setup needed

## Quick Start

### New Installation

```bash
# One-line install (includes NATS server)
curl -fsSL https://raw.githubusercontent.com/TinyAGI/tinyclaw/main/scripts/remote-install.sh | bash

# Start TinyClaw (automatically starts NATS)
tinyclaw start
```

### Existing Installation

```bash
# Update to NATS version
tinyclaw update

# Install NATS binary
tinyclaw nats install

# Start TinyClaw
tinyclaw start
```

## NATS CLI Commands

TinyClaw now manages NATS directly through the CLI:

```bash
# NATS management
tinyclaw nats start      # Start NATS server
tinyclaw nats stop       # Stop NATS server
tinyclaw nats status     # Show NATS status
tinyclaw nats logs 100   # Show last 100 log lines
tinyclaw nats logs -f    # Follow logs in real-time
tinyclaw nats install    # Download and install NATS binary

# TinyClaw (includes NATS)
tinyclaw start           # Starts NATS → orchestrator → channels
tinyclaw stop            # Stops everything including NATS
tinyclaw status          # Shows NATS + all process status
tinyclaw restart         # Full restart including NATS
```

## Architecture Changes

### Before (SQLite)

```
Channel Client → SQLite DB → Queue Processor → Agent
                    ↑              ↓
              Shared State    In-Memory Map
```

Problems:
- Race conditions with concurrent agents
- Complex locking logic
- In-memory state lost on restart
- Single-machine limitation

### After (NATS - Initial Migration)

```
Channel Client → API → NATS JetStream → Agent Consumer
                                    ↓
                              Response Consumer → Channel Client
```

Benefits:
- Each agent has durable consumer (sequential processing)
- Message state persisted in NATS
- No shared locks needed
- Can scale to multiple machines

### After (NATS - Direct Client Connection)

```
┌─────────────────────────────────────────────────────────┐
│                      NATS Server                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Messages    │  │ Responses   │  │ Events          │ │
│  │ (agents)    │  │ (channels)  │  │ (UI)            │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────┘ │
│         │                │                              │
└─────────┼────────────────┼──────────────────────────────┘
          │                │
    ┌─────┴─────┐    ┌─────┴──────────┐
    │           │    │                  │
    ▼           ▼    ▼                  ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│ Agent  │ │ Agent  │ │ Telegram │ │ Discord  │
│ Sam    │ │ Wit    │ │ Client   │ │ Client   │
│(pull)  │ │(pull)  │ │(pull)    │ │(pull)    │
└────────┘ └────────┘ └──────────┘ └──────────┘
```

Benefits:
- **No HTTP polling** - Channel clients connect directly to NATS
- **Lower latency** - Sub-100ms instead of 1s polling
- **Better durability** - Messages persist until acknowledged
- **Horizontal scaling** - Each component can run on separate machines
- **Simpler code** - No in-memory buffers or HTTP endpoints

## How It Works

### Message Flow (User → Agent)

1. **Channel Client** (Telegram/Discord/WhatsApp) receives user message
2. **Channel Client** POSTs to `/api/message` (HTTP)
3. **Orchestrator** receives message, routes to appropriate agent
4. **Orchestrator** publishes to `tinyclaw.messages.{agentId}` (NATS)
5. **Agent Consumer** pulls message from NATS, processes with AI
6. **Agent Consumer** publishes response to `tinyclaw.responses.{channel}` (NATS)
7. **Channel Client** pulls response from NATS, sends to user
8. **Channel Client** acknowledges message (removes from NATS)

### Key Difference

| Aspect | Old (HTTP Polling) | New (Direct NATS) |
|--------|-------------------|-------------------|
| Response delivery | HTTP poll every 1s | NATS push (immediate) |
| Buffer | In-memory Map | NATS stream (durable) |
| Acknowledgment | HTTP POST /ack | NATS msg.ack() |
| Latency | 1-2 seconds | <100 milliseconds |
| Durability | Lost on crash | Persisted until ack |

## File Structure

```
~/.tinyclaw/
├── bin/
│   └── nats-server          # NATS binary (auto-installed)
├── nats/                    # NATS data directory
├── nats.conf                # NATS config (auto-generated)
├── nats.pid                 # PID file
├── logs/
│   ├── nats.log            # NATS logs
│   ├── orchestrator.log    # Orchestrator logs
│   └── [channel].log       # Channel logs
└── settings.json           # TinyClaw settings
```

## Configuration

### Settings.json

```json
{
  "nats": {
    "port": 4222,
    "http_port": 8222
  }
}
```

### Environment Variables

Channel clients read these environment variables:

```bash
export NATS_URL="nats://localhost:4222"        # NATS server URL
export NATS_STREAM_PREFIX="tinyclaw"           # Stream name prefix
```

These are automatically set by `tinyclaw start`.

## File Changes

### New Files
- `lib/nats.sh` - NATS lifecycle management for CLI
- `src/nats/connection.ts` - NATS connection management
- `src/nats/streams.ts` - JetStream stream setup
- `src/nats/types.ts` - TypeScript definitions
- `src/nats/publisher.ts` - Message publishing functions
- `src/nats/agent-consumer.ts` - Per-agent message consumer
- `src/nats/client-consumer.ts` - Shared consumer for channel clients
- `src/nats/index.ts` - Module exports
- `src/orchestrator.ts` - New main orchestrator (replaces queue-processor)

### Modified Files
- `tinyclaw.sh` - Export NATS_URL and NATS_STREAM_PREFIX
- `lib/daemon.sh` - Pass NATS env vars to channel clients
- `src/channels/telegram-client.ts` - Connect directly to NATS
- `src/channels/discord-client.ts` - Connect directly to NATS
- `src/channels/whatsapp-client.ts` - Connect directly to NATS
- `scripts/remote-install.sh` - Auto-install NATS
- `package.json` - Swap `better-sqlite3` for `nats`
- `src/server/routes/messages.ts` - Use NATS publisher
- `src/server/routes/queue.ts` - Remove response endpoints
- `src/server/index.ts` - Remove conversations parameter
- `src/lib/conversation.ts` - Use NATS instead of SQLite

### Deleted Files
- `src/lib/db.ts` - SQLite database operations
- `src/queue-processor.ts` - SQLite-based orchestrator
- `src/nats/response-buffer.ts` - In-memory buffer (no longer needed)
- `src/nats/response-consumer.ts` - HTTP bridge consumer (no longer needed)

## Verification

Check NATS status:
```bash
tinyclaw nats status
```

Check that NATS streams are created:
```bash
# Using NATS CLI (if installed separately)
nats stream ls

# Should show:
# tinyclaw_MESSAGES
# tinyclaw_RESPONSES
# tinyclaw_EVENTS
```

Check queue status via API:
```bash
curl http://localhost:3777/api/queue/status
```

View NATS logs:
```bash
tinyclaw nats logs -f
```

## Troubleshooting

### NATS Not Starting

```
Failed to start NATS server
Run 'tinyclaw install-nats' to install NATS binary
```

**Solution**: Install NATS binary:
```bash
tinyclaw nats install
```

### NATS Connection Failed

```
ERROR: NATS connection failed: Error: connect ECONNREFUSED 127.0.0.1:4222
```

**Solution**: Check NATS status and start if needed:
```bash
tinyclaw nats status
tinyclaw nats start
```

### Port Already in Use

```
Error: listen tcp 0.0.0.0:4222: bind: address already in use
```

**Solution**: Another NATS instance is running. Stop it:
```bash
# Find and kill existing NATS
pkill nats-server
# Or use tinyclaw
tinyclaw nats stop
```

### Stream Already Exists

This is normal - streams are created once and reused.

### Messages Not Processing

Check agent consumers:
```bash
# If you have NATS CLI installed
nats consumer ls tinyclaw_MESSAGES
```

Check for errors in logs:
```bash
tinyclaw logs
tinyclaw nats logs
```

### Channel Client Can't Connect to NATS

If channel clients show "NATS connection failed" errors:

1. Check NATS is running:
   ```bash
   tinyclaw nats status
   ```

2. Check environment variables in tmux:
   ```bash
   tmux attach -t tinyclaw
   # In each pane:
   echo $NATS_URL
   ```

3. Verify port in settings.json matches NATS_URL:
   ```bash
   jq '.nats.port' ~/.tinyclaw/settings.json
   ```

## Rollback

To rollback to SQLite version:

1. Stop TinyClaw:
   ```bash
   tinyclaw stop
   ```

2. Checkout pre-NATS commit

3. Restore `tinyclaw.db` from backup if available

4. Restart TinyClaw:
   ```bash
   tinyclaw start
   ```

## Performance Considerations

- **Message throughput**: NATS can handle millions of messages/sec
- **Memory usage**: NATS uses ~50MB base + stream storage
- **Disk usage**: JetStream persists to disk (configurable, default 10GB)
- **Latency**: Sub-millisecond for local NATS
- **Ports used**: 4222 (client), 8222 (HTTP monitoring)

## Further Reading

- [NATS Documentation](https://docs.nats.io/)
- [JetStream Concepts](https://docs.nats.io/nats-concepts/jetstream)
- [TinyClaw Architecture](docs/ARCHITECTURE.md)