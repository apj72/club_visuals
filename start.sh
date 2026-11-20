#!/bin/bash
cd "$(dirname "$0")"

if lsof -tiTCP:8008 -sTCP:LISTEN > /dev/null 2>&1; then
    if curl --fail --silent --max-time 2 http://localhost:8008/api/app-info | grep -q '"interface": "default"'; then
        echo "Already running at http://localhost:8008"
        exit 0
    fi
    echo "Restarting outdated Club Visuals server..."
    ./stop.sh
fi

nohup python3 server.py > /private/tmp/club_visuals_server.log 2>&1 < /dev/null &
echo $! > .server.pid
for attempt in {1..30}; do
    if curl --fail --silent --max-time 1 http://localhost:8008/api/app-info | grep -q '"interface": "default"'; then
        echo "Started at http://localhost:8008"
        open http://localhost:8008
        exit 0
    fi
    sleep 0.1
done
echo "Could not start Club Visuals. Check /private/tmp/club_visuals_server.log"
exit 1
