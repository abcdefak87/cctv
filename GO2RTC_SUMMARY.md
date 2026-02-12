# go2rtc Migration Summary

## What Changed

### Backend Code
✅ `backend/internal/config/config.go`
- Renamed `MediaMTXConfig` → `Go2RTCConfig`
- Updated env vars: `MEDIAMTX_*` → `GO2RTC_*`
- Changed default API port: 9997 → 1984

✅ `backend/internal/handlers/stream.go`
- Updated all references from `MediaMTX` to `Go2RTC`
- Changed comments to reference go2rtc

✅ `backend/internal/config/config_test.go`
- Updated test cases for go2rtc configuration

### Configuration Files
✅ `go2rtc/go2rtc.yaml` (NEW)
- Replaced `mediamtx/mediamtx.yml`
- API port: 1984
- HLS port: 8888 (unchanged)
- WebRTC port: 8555 (was 8889)

### Docker Files
✅ `Dockerfile`
- Download go2rtc instead of MediaMTX
- Updated exposed ports
- Updated binary paths

✅ `docker-compose.yml`
- Updated port mappings
- Updated volume mounts
- Updated comments

✅ `docker-entrypoint.sh`
- Start go2rtc instead of MediaMTX
- Updated process names

### Deployment Files
✅ `deployment/install-go2rtc.sh` (NEW)
- Automated installation script
- Downloads go2rtc binary
- Updates backend .env

✅ `deployment/go2rtc.service` (NEW)
- Systemd service file for go2rtc

### Documentation
✅ `MIGRATION_GO2RTC.md` (NEW)
- Complete migration guide
- Step-by-step instructions
- Troubleshooting tips
- Rollback plan

## Environment Variables

### Old (MediaMTX)
```bash
MEDIAMTX_API_URL=http://localhost:9997
MEDIAMTX_HLS_URL_INTERNAL=http://localhost:8888
```

### New (go2rtc)
```bash
GO2RTC_API_URL=http://localhost:1984
GO2RTC_HLS_URL_INTERNAL=http://localhost:8888
```

## Port Changes

| Service | Old Port | New Port |
|---------|----------|----------|
| API | 9997 | 1984 |
| HLS | 8888 | 8888 (unchanged) |
| WebRTC | 8889 | 8555 |
| RTSP | 8554 | 8554 (unchanged) |

## Quick Migration Steps

1. **Install go2rtc**
   ```bash
   cd /home/defak/Projects/cctv
   ./deployment/install-go2rtc.sh
   ```

2. **Stop MediaMTX**
   ```bash
   pm2 stop cctv-mediamtx
   pm2 delete cctv-mediamtx
   ```

3. **Start go2rtc**
   ```bash
   cd go2rtc
   pm2 start ./go2rtc --name cctv-go2rtc -- -config go2rtc.yaml
   pm2 save
   ```

4. **Rebuild Backend**
   ```bash
   cd backend
   go build -o bin/server cmd/server/main.go
   pm2 restart cctv-backend
   ```

5. **Test**
   ```bash
   curl http://localhost:1984/api
   ```

## Files NOT Changed

- Frontend code (no changes needed)
- Database schema
- Nginx configuration (HLS port unchanged)
- Recording functionality
- API endpoints

## Benefits of go2rtc

1. **Better WebRTC** - Lower latency (<1s vs 6-10s HLS)
2. **More Protocols** - RTSP, RTMP, WebRTC, HLS, MSE, MP4, MJPEG
3. **Active Development** - Regular updates
4. **Smaller Binary** - More efficient
5. **Better API** - RESTful design

## Testing Checklist

- [ ] go2rtc API responds on port 1984
- [ ] HLS streams work on port 8888
- [ ] Backend starts without errors
- [ ] Frontend loads camera streams
- [ ] WebRTC works (if enabled)
- [ ] Recording still works
- [ ] No console errors

## Rollback

If issues occur, see `MIGRATION_GO2RTC.md` for rollback instructions.

---

**Migration Date**: 2026-02-12  
**Status**: Code updated, ready for deployment
