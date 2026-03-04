#!/bin/bash
# NATS Server Lifecycle Management for TinyClaw
#
# This module manages the NATS server that TinyClaw uses for message queuing.
# It handles start, stop, status, and log viewing.

NATS_BIN="${TINYCLAW_HOME}/bin/nats-server"
NATS_DATA_DIR="${TINYCLAW_HOME}/nats"
NATS_PID_FILE="${TINYCLAW_HOME}/nats.pid"
NATS_LOG="${LOG_DIR}/nats.log"
NATS_CONFIG="${TINYCLAW_HOME}/nats.conf"

# Check if NATS server binary exists
nats_binary_exists() {
    [ -f "$NATS_BIN" ] && [ -x "$NATS_BIN" ]
}

# Check if NATS is currently running
nats_is_running() {
    if [ -f "$NATS_PID_FILE" ]; then
        local pid
        pid=$(cat "$NATS_PID_FILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Get NATS version
nats_version() {
    if nats_binary_exists; then
        "$NATS_BIN" --version 2>/dev/null | head -1
    else
        echo "not installed"
    fi
}

# Start NATS server
nats_start() {
    if nats_is_running; then
        log_info "NATS server already running (PID: $(cat "$NATS_PID_FILE"))"
        return 0
    fi
    
    if ! nats_binary_exists; then
        log_error "NATS server not found at $NATS_BIN"
        log_info "Run: tinyclaw install-nats"
        return 1
    fi
    
    # Create data directory
    mkdir -p "$NATS_DATA_DIR"
    
    # Load settings for custom config
    local nats_port="4222"
    local nats_http_port="8222"
    
    if [ -f "$SETTINGS_FILE" ]; then
        nats_port=$(jq -r '.nats.port // "4222"' "$SETTINGS_FILE" 2>/dev/null)
        nats_http_port=$(jq -r '.nats.http_port // "8222"' "$SETTINGS_FILE" 2>/dev/null)
    fi
    
    log_info "Starting NATS server on port $nats_port..."
    
    # Create minimal config
    cat > "$NATS_CONFIG" << EOF
# TinyClaw NATS Configuration
port: $nats_port
http_port: $nats_http_port
jetstream {
    store_dir: "$NATS_DATA_DIR"
    max_memory_store: 1GB
    max_file_store: 10GB
}
EOF
    
    # Start NATS daemon
    "$NATS_BIN" \
        -c "$NATS_CONFIG" \
        --pid_file "$NATS_PID_FILE" \
        --log_file "$NATS_LOG" \
        --daemon
    
    # Wait for NATS to be ready
    local retries=0
    while [ $retries -lt 10 ]; do
        if nats_is_running; then
            log_info "NATS server started (PID: $(cat "$NATS_PID_FILE"), ports: $nats_port, $nats_http_port)"
            return 0
        fi
        sleep 1
        retries=$((retries + 1))
    done
    
    log_error "NATS server failed to start. Check $NATS_LOG"
    return 1
}

# Stop NATS server
nats_stop() {
    if ! nats_is_running; then
        log_info "NATS server not running"
        rm -f "$NATS_PID_FILE"
        return 0
    fi
    
    local pid
    pid=$(cat "$NATS_PID_FILE" 2>/dev/null)
    
    log_info "Stopping NATS server (PID: $pid)..."
    
    # Try graceful shutdown first
    if kill "$pid" 2>/dev/null; then
        local retries=0
        while [ $retries -lt 10 ] && nats_is_running; do
            sleep 1
            retries=$((retries + 1))
        done
    fi
    
    # Force kill if still running
    if nats_is_running; then
        log_warn "NATS server didn't stop gracefully, forcing..."
        kill -9 "$pid" 2>/dev/null
        sleep 1
    fi
    
    rm -f "$NATS_PID_FILE"
    log_info "NATS server stopped"
}

# Show NATS status
nats_status() {
    if nats_is_running; then
        local pid
        pid=$(cat "$NATS_PID_FILE" 2>/dev/null)
        echo -e "${GREEN}●${NC} NATS server running (PID: $pid)"
        echo "  Version: $(nats_version)"
        echo "  Binary: $NATS_BIN"
        echo "  Data: $NATS_DATA_DIR"
        echo "  Logs: $NATS_LOG"
        if [ -f "$NATS_CONFIG" ]; then
            echo "  Config: $NATS_CONFIG"
            echo "  Ports: $(grep -E '^(port|http_port):' "$NATS_CONFIG" | tr '\n' ' ')"
        fi
        return 0
    else
        echo -e "${RED}○${NC} NATS server not running"
        if nats_binary_exists; then
            echo "  Binary: $NATS_BIN ($(nats_version))"
        else
            echo "  Binary: not installed"
        fi
        return 1
    fi
}

# View NATS logs
nats_logs() {
    if [ -f "$NATS_LOG" ]; then
        tail -${1:-50} "$NATS_LOG"
    else
        log_warn "NATS log file not found: $NATS_LOG"
    fi
}

# Follow NATS logs
nats_logs_follow() {
    if [ -f "$NATS_LOG" ]; then
        tail -f "$NATS_LOG"
    else
        log_warn "NATS log file not found: $NATS_LOG"
    fi
}

# Install NATS binary
nats_install() {
    if nats_binary_exists; then
        log_info "NATS server already installed: $(nats_version)"
        echo "Binary: $NATS_BIN"
        return 0
    fi
    
    log_info "Installing NATS server..."
    
    mkdir -p "$(dirname "$NATS_BIN")"
    
    # Detect OS and architecture
    local os arch nats_arch
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    arch=$(uname -m)
    
    case "$arch" in
        x86_64) nats_arch="amd64" ;;
        aarch64|arm64) nats_arch="arm64" ;;
        *) 
            log_error "Unsupported architecture: $arch"
            return 1
            ;;
    esac
    
    # NATS version to install
    local nats_version="2.10.24"
    local nats_tar="nats-server-v${nats_version}-${os}-${nats_arch}.tar.gz"
    local nats_url="https://github.com/nats-io/nats-server/releases/download/v${nats_version}/${nats_tar}"
    
    log_info "Downloading NATS v${nats_version} for ${os}/${nats_arch}..."
    
    local temp_dir
    temp_dir=$(mktemp -d)
    
    if ! curl -fsSL "$nats_url" -o "${temp_dir}/${nats_tar}"; then
        log_error "Failed to download NATS from $nats_url"
        rm -rf "$temp_dir"
        return 1
    fi
    
    log_info "Extracting..."
    if ! tar -xzf "${temp_dir}/${nats_tar}" -C "$(dirname "$NATS_BIN")" --strip-components=1; then
        log_error "Failed to extract NATS archive"
        rm -rf "$temp_dir"
        return 1
    fi
    
    chmod +x "$NATS_BIN"
    rm -rf "$temp_dir"
    
    log_info "NATS server installed: $(nats_version)"
    log_info "Binary location: $NATS_BIN"
}