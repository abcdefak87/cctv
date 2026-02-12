# Migration Guide: MediaMTX → go2rtc

This guide covers migrating from MediaMTX to go2rtc for the RAF NET CCTV system.

## Why go2rtc?

- **Better WebRTC support** - Lower latency for real-time viewing
- **More protocols** - RTSP, RTMP, WebRTC, HLS, MSE, MP4, MJPEG
- **Active development** - Regular updates and improvements
- **Smaller footprint** - More efficient resource usage
- **Better API** - RESTful API for stream management

## Changes Overview

### Configuration
- **API Port**: 9997 → 1984
- **Config File**: `mediamtx.yml` → `go2rtc.yaml`
- **Environment Variables**: `MEDIAMTX_*` → `GO2RTC_*`

### Architecture
- Same HLS port (8888) for compatibility
- Same RTSP port (8554)
- WebRTC port changed: 8889 → 8555

## Migration Steps

### 1. Download go2rtc

```bash
cd /home/defak/Projects/cctv
mkdir -p go2rtc
cd go2rtc

# Download latest release
wget https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64
mv go2rtc_linux_amd64 go2rtc
chmod +x go2rtc
```

### 2. Update Backend Environment Variables

Edit `backend/.env`:

```bash
# Old (MediaMTX)
MEDIAMTX_API_URL=http://localhost:9997
MEDIAMTX_HLS_URL_INTERNAL=http://localhost:8888

# New (go2rtc)
GO2RTC_API_URL=http://localhost:1984
GO2RTC_HLS_URL_INTERNAL=http://localhost:8888
```

### 3. Stop MediaMTX

```bash
# If using PM2
pm2 stop cctv-mediamtx
pm2 delete cctv-mediamtx

# If using systemd
sudo systemctl stop mediamtx
sudo systemctl disable mediamtx
```

### 4. Start go2rtc

```bash
cd /home/defak/Projects/cctv/go2rtc
./go2rtc -config go2rtc.yaml
```

Or with PM2:

```bash
pm2 start ./go2rtc --name cctv-go2rtc -- -config go2rtc.yaml
pm2 save
```

### 5. Rebuild Backend

```bash
cd /home/defak/Projects/cctv/backend
go build -o bin/server cmd/server/main.go
pm2 restart cctv-backend
```

### 6. Test Streams

```bash
# Check go2rtc API
curl http://localhost:1984/api

# Check HLS stream (replace with your stream key)
curl http://localhost:8888/test-1770580485/index.m3u8
```

## Configuration Comparison

### MediaMTX (mediamtx.yml)
```yaml
api: yes
apiAddress: :9997
hls: yes
hlsAddress: :8888
webrtc: yes
webrtcAddress: :8889
```

### go2rtc (go2rtc.yaml)
```yaml
api:
  listen: ":1984"
hls:
  listen: ":8888"
webrtc:
  listen: ":8555/tcp"
```

## API Differences

### MediaMTX API
- `GET /v3/paths/list` - List all paths
- `POST /v3/config/paths/add/{name}` - Add path

### go2rtc API
- `GET /api/streams` - List all streams
- `POST /api/streams` - Add stream (JSON body)

## Rollback Plan

If issues occur:

```bash
# Stop go2rtc
pm2 stop cctv-go2rtc

# Restore MediaMTX env vars in backend/.env
GO2RTC_API_URL=http://localhost:9997  # Change back
GO2RTC_HLS_URL_INTERNAL=http://localhost:8888

# Start MediaMTX
pm2 start cctv-mediamtx

# Restart backend
pm2 restart cctv-backend
```

## Verification Checklist

- [ ] go2rtc binary downloaded and executable
- [ ] go2rtc.yaml configuration created
- [ ] Backend .env updated with GO2RTC_* variables
- [ ] Backend rebuilt with new config
- [ ] go2rtc running on port 1984
- [ ] HLS streams accessible on port 8888
- [ ] Frontend can load camera streams
- [ ] No errors in backend logs
- [ ] No errors in go2rtc logs

## Troubleshooting

### go2rtc won't start
```bash
# Check if port 1984 is in use
sudo lsof -i :1984

# Check logs
pm2 logs cctv-go2rtc
```

### Streams not loading
```bash
# Verify go2rtc is running
curl http://localhost:1984/api

# Check stream configuration
curl http://localhost:1984/api/streams

# Test HLS endpoint
curl http://localhost:8888/{stream-key}/index.m3u8
```

### Backend errors
```bash
# Check backend logs
pm2 logs cctv-backend

# Verify environment variables
cd backend
cat .env | grep GO2RTC
```

## Performance Comparison

| Metric | MediaMTX | go2rtc |
|--------|----------|--------|
| API Port | 9997 | 1984 |
| Memory Usage | ~30MB | ~25MB |
| CPU Usage | Low | Low |
| Latency (HLS) | 6-10s | 6-10s |
| Latency (WebRTC) | N/A | <1s |
| Protocols | RTSP, HLS, WebRTC | RTSP, HLS, WebRTC, MSE, MP4 |

## Additional Resources

- [go2rtc Documentation](https://github.com/AlexxIT/go2rtc)
- [go2rtc API Reference](https://github.com/AlexxIT/go2rtc/wiki/API)
- [MediaMTX to go2rtc Migration](https://github.com/AlexxIT/go2rtc/wiki/Migration)

---

**Migration Date**: 2026-02-12  
**Tested On**: Ubuntu 20.04, Golang 1.21+
