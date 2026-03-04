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
- CLI-managed, no external dependencies

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

NATS is configured automatically. Advanced users can customize via `settings.json`:

```json
{
  "nats": {
    "port": 4222,
    "http_port": 8222
  }
}
```

Or use environment variable:
```bash
export NATS_URL=nats://localhost:4222
```

## File Changes

### New Files
- `lib/nats.sh` - NATS lifecycle management for CLI
- `src/nats/connection.ts` - NATS connection management
- `src/nats/streams.ts` - JetStream stream setup
- `src/nats/types.ts` - TypeScript definitions
- `src/nats/publisher.ts` - Message publishing functions
- `src/nats/agent-consumer.ts` - Per-agent message consumer
- `src/nats/response-consumer.ts` - Response delivery consumer
- `src/nats/index.ts` - Module exports
- `src/orchestrator.ts` - New main orchestrator (replaces queue-processor)

### Modified Files
- `tinyclaw.sh` - Add nats subcommand, source lib/nats.sh
- `lib/daemon.sh` - Start/stop NATS with daemon
- `scripts/remote-install.sh` - Auto-install NATS
- `package.json` - Swap `better-sqlite3` for `nats`
- `src/server/routes/messages.ts` - Use NATS publisher
- `src/server/routes/queue.ts` - Query NATS consumer info
- `src/server/index.ts` - Remove conversations parameter
- `src/lib/conversation.ts` - Use NATS instead of SQLite
- `src/visualizer/team-visualizer.tsx` - Use API instead of SQLite

### Deleted Files
- `src/lib/db.ts` - SQLite database operations
- `src/queue-processor.ts` - SQLite-based orchestrator

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