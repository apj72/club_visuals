#!/bin/bash
cd "$(dirname "$0")"

if lsof -tiTCP:8008 -sTCP:LISTEN > /dev/null 2>&1; then
    if curl --fail --silent --max-time 2 --output /dev/null http://localhost:8008/auto_perform.js; then
        echo "Already running at http://localhost:8008"
        exit 0
    fi
    echo "Restarting outdated Club Visuals server..."
    ./stop.sh
fi

nohup python3 server.py > /private/tmp/club_visuals_server.log 2>&1 < /dev/null &
echo $! > .server.pid
echo "Started at http://localhost:8008"
open http://localhost:8008
