# go2rtc Quick Reference

## Installation

```bash
cd /home/defak/Projects/cctv
./deployment/install-go2rtc.sh
```

## Manual Installation

```bash
# Download
cd /home/defak/Projects/cctv/go2rtc
wget https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64 -O go2rtc
chmod +x go2rtc

# Update backend/.env
GO2RTC_API_URL=http://localhost:1984
GO2RTC_HLS_URL_INTERNAL=http://localhost:8888

# Start
./go2rtc -config go2rtc.yaml
```

## PM2 Commands

```bash
# Start
pm2 start ./go2rtc --name cctv-go2rtc -- -config go2rtc.yaml

# Stop
pm2 stop cctv-go2rtc

# Restart
pm2 restart cctv-go2rtc

# Logs
pm2 logs cctv-go2rtc

# Save
pm2 save
```

## Systemd Commands

```bash
# Install service
sudo cp deployment/go2rtc.service /etc/systemd/system/
sudo systemctl daemon-reload

# Start
sudo systemctl start go2rtc

# Enable on boot
sudo systemctl enable go2rtc

# Status
sudo systemctl status go2rtc

# Logs
sudo journalctl -u go2rtc -f
```

## API Endpoints

```bash
# Health check
curl http://localhost:1984/api

# List streams
curl http://localhost:1984/api/streams

# Get stream info
curl http://localhost:1984/api/streams?src=test-1770580485

# Add stream (POST)
curl -X POST http://localhost:1984/api/streams \
  -H "Content-Type: application/json" \
  -d '{"name":"camera1","url":"rtsp://..."}'
```

## HLS Testing

```bash
# Test HLS stream
curl http://localhost:8888/{stream-key}/index.m3u8

# Example
curl http://localhost:8888/test-1770580485/index.m3u8
```

## Configuration

### go2rtc.yaml
```yaml
api:
  listen: ":1984"
hls:
  listen: ":8888"
webrtc:
  listen: ":8555/tcp"
rtsp:
  listen: ":8554"
log:
  level: info
streams:
  # Managed by backend
```

### backend/.env
```bash
GO2RTC_API_URL=http://localhost:1984
GO2RTC_HLS_URL_INTERNAL=http://localhost:8888
PUBLIC_STREAM_BASE_URL=https://api-cctv.raf.my.id
```

## Troubleshooting

### go2rtc won't start
```bash
# Check port
sudo lsof -i :1984

# Check config
./go2rtc -config go2rtc.yaml

# Check logs
pm2 logs cctv-go2rtc --lines 100
```

### Streams not loading
```bash
# Test API
curl http://localhost:1984/api

# Test HLS
curl http://localhost:8888/{stream-key}/index.m3u8

# Check backend logs
pm2 logs cctv-backend
```

### Backend errors
```bash
# Check env vars
cd backend
cat .env | grep GO2RTC

# Rebuild
go build -o bin/server cmd/server/main.go

# Restart
pm2 restart cctv-backend
```

## Port Reference

| Service | Port | Protocol |
|---------|------|----------|
| API | 1984 | HTTP |
| HLS | 8888 | HTTP |
| WebRTC | 8555 | TCP |
| RTSP | 8554 | TCP |

## Useful Links

- [go2rtc GitHub](https://github.com/AlexxIT/go2rtc)
- [go2rtc Documentation](https://github.com/AlexxIT/go2rtc/wiki)
- [API Reference](https://github.com/AlexxIT/go2rtc/wiki/API)

---

**Quick Start**: `./deployment/install-go2rtc.sh`  
**Full Guide**: See `MIGRATION_GO2RTC.md`
