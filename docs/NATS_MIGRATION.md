# NATS Migration Guide

This document describes the migration from SQLite to NATS JetStream for TinyClaw's message queue.

## Overview

TinyClaw has migrated from SQLite (`better-sqlite3`) to NATS JetStream for message queuing. This change:

- **Fixes race conditions** in multi-agent handoffs (Wit→Sam bug)
- **Improves reliability** with durable message streams
- **Enables horizontal scaling** (agents can run on different machines)
- **Simplifies architecture** by eliminating manual locks and counters

## Prerequisites

You need a NATS server with JetStream enabled:

```bash
# Using Docker
docker run -p 4222:4222 -p 8222:8222 nats:latest -js

# Or download NATS directly
curl -sf https://get-nats.io | sh
./nats-server -js
```

## Configuration

Add to your `.env` file:

```bash
NATS_URL=nats://localhost:4222
# Optional: NATS_STREAM_PREFIX=tinyclaw
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

### After (NATS)

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

## File Changes

### New Files
- `src/nats/connection.ts` - NATS connection management
- `src/nats/streams.ts` - JetStream stream setup
- `src/nats/types.ts` - TypeScript definitions
- `src/nats/publisher.ts` - Message publishing functions
- `src/nats/agent-consumer.ts` - Per-agent message consumer
- `src/nats/response-consumer.ts` - Response delivery consumer
- `src/nats/index.ts` - Module exports
- `src/orchestrator.ts` - New main orchestrator (replaces queue-processor)

### Modified Files
- `package.json` - Swap `better-sqlite3` for `nats`
- `src/server/routes/messages.ts` - Use NATS publisher
- `src/server/routes/queue.ts` - Query NATS consumer info
- `src/server/index.ts` - Remove conversations parameter
- `src/lib/conversation.ts` - Use NATS instead of SQLite
- `src/visualizer/team-visualizer.tsx` - Use API instead of SQLite

### Deleted Files
- `src/lib/db.ts` - SQLite database operations
- `src/queue-processor.ts` - SQLite-based orchestrator

## Migration Steps for Users

1. **Install NATS server** (see Prerequisites above)

2. **Update environment**:
   ```bash
   # Add to .env
   NATS_URL=nats://localhost:4222
   ```

3. **Reinstall dependencies**:
   ```bash
   npm install
   ```

4. **Start TinyClaw**:
   ```bash
   ./tinyclaw.sh start
   # or
   npm run orchestrator
   ```

## Verification

Check that NATS streams are created:

```bash
# Using NATS CLI
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

## Troubleshooting

### NATS Connection Failed

```
ERROR: NATS connection failed: Error: connect ECONNREFUSED 127.0.0.1:4222
```

**Solution**: Start NATS server:
```bash
docker run -p 4222:4222 nats:latest -js
```

### Stream Already Exists

This is normal - streams are created once and reused.

### Messages Not Processing

Check agent consumers:
```bash
nats consumer ls tinyclaw_MESSAGES
```

Check for errors in logs:
```bash
./tinyclaw.sh logs
```

## Rollback

To rollback to SQLite version:

1. Checkout pre-NATS commit
2. Restore `tinyclaw.db` from backup
3. Restart TinyClaw

## Performance Considerations

- **Message throughput**: NATS can handle millions of messages/sec
- **Memory usage**: NATS uses ~50MB base + stream storage
- **Disk usage**: JetStream persists to disk (configurable)
- **Latency**: Sub-millisecond for local NATS

## Further Reading

- [NATS Documentation](https://docs.nats.io/)
- [JetStream Concepts](https://docs.nats.io/nats-concepts/jetstream)
- [TinyClaw Architecture](docs/ARCHITECTURE.md)