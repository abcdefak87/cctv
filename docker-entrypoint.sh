#!/bin/sh
set -e

echo "Starting RAF NET CCTV Services..."

# Start go2rtc in background
echo "Starting go2rtc..."
cd /app/go2rtc
./go2rtc -config go2rtc.yaml &
GO2RTC_PID=$!

# Wait for go2rtc to start
sleep 3

# Start Backend
echo "Starting Golang Backend..."
cd /app/backend
./server &
BACKEND_PID=$!

echo "All services started!"
echo "go2rtc PID: $GO2RTC_PID"
echo "Backend PID: $BACKEND_PID"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
