#!/usr/bin/env bash
# ============================================================
# FreightFlow SAAS — Dev Server Startup Script
# Usage: bash start.sh
# ============================================================
set -e

cd "$(dirname "$0")"

echo "==> FreightFlow SAAS — starting dev server on http://0.0.0.0:3000"
echo "    Project root: $(pwd)"
echo ""

# 1. Install dependencies if node_modules is missing
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "==> node_modules not found — running npm install (this can take 1-2 min)…"
    npm install
else
    echo "==> node_modules present — skipping npm install"
fi

# 2. Kill any existing process on port 3000 (stale server from prior session)
EXISTING_PID=$(lsof -ti tcp:3000 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
    echo "==> Killing stale process on :3000 (PID $EXISTING_PID)"
    kill -9 $EXISTING_PID 2>/dev/null || true
    sleep 1
fi

# 3. Launch the Next.js dev server (Turbopack) bound to all interfaces
echo "==> Launching Next.js dev server…"
echo ""
exec npm run dev -- --hostname 0.0.0.0 --port 3000
