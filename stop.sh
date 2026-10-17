#!/bin/bash
cd "$(dirname "$0")"

server_pids=$(lsof -tiTCP:8008 -sTCP:LISTEN 2>/dev/null)
if [ -n "$server_pids" ]; then
    kill $server_pids 2>/dev/null
fi
rm -f .server.pid

echo "Stopped."
