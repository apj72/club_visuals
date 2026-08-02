#!/bin/bash
cd "$(dirname "$0")"

if [ -f .server.pid ]; then
    kill "$(cat .server.pid)" 2>/dev/null
    rm .server.pid
fi

lsof -ti:8008 | xargs kill 2>/dev/null

echo "Stopped."
