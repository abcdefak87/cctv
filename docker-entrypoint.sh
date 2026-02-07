#!/bin/sh
set -e

echo "Starting RAF NET CCTV Services..."

# Start MediaMTX in background
echo "Starting MediaMTX..."
cd /app/mediamtx
./mediamtx mediamtx.yml &
MEDIAMTX_PID=$!

# Wait for MediaMTX to start
sleep 3

# Start Backend
echo "Starting Golang Backend..."
cd /app/backend
./server &
BACKEND_PID=$!

echo "All services started!"
echo "MediaMTX PID: $MEDIAMTX_PID"
echo "Backend PID: $BACKEND_PID"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
