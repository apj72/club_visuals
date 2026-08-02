#!/bin/bash
cd "$(dirname "$0")"

if lsof -ti:8008 > /dev/null 2>&1; then
    echo "Already running at http://localhost:8008"
    exit 0
fi

python3 server.py &
echo $! > .server.pid
echo "Started at http://localhost:8008"
open http://localhost:8008
