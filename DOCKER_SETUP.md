# 🐳 Docker Setup Guide

## Quick Start

### 1. Build & Run

```bash
docker compose up -d
```

### 2. Check Status

```bash
docker compose ps
docker compose logs -f
```

### 3. Access Services

- **Frontend**: http://localhost:8090
- **Backend API**: http://localhost:3001
- **MediaMTX HLS**: http://localhost:8888
- **MediaMTX API**: http://localhost:9997

## Services

### Backend (Golang)
- Port: 3001
- Health: http://localhost:3001/health
- API: http://localhost:3001/api/*

### Frontend (React)
- Port: 8090 (via Nginx)
- Served from: /usr/share/nginx/html

### MediaMTX (Streaming)
- HLS: 8888
- WebRTC: 8889
- API: 9997

## Database

SQLite database is stored in:
- Container: `/app/backend/data/cctv.db`
- Host: `./backend/data/cctv.db` (persistent volume)

## Configuration

### Backend (.env)
Edit `backend/.env` and restart:
```bash
docker compose restart cctv-app
```

### MediaMTX (mediamtx.yml)
Edit `mediamtx/mediamtx.yml` and restart:
```bash
docker compose restart cctv-app
```

### Nginx (nginx.conf)
Edit `nginx.conf` and restart:
```bash
docker compose restart nginx
```

## Management

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f cctv-app
docker compose logs -f nginx
```

### Restart Services
```bash
# All services
docker compose restart

# Specific service
docker compose restart cctv-app
```

### Stop Services
```bash
docker compose down
```

### Rebuild
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Volumes

Persistent data is stored in:
- `./backend/data` - SQLite database
- `./recordings` - Camera recordings
- `./logs` - Application logs

## Troubleshooting

### Port Already in Use
Edit `docker-compose.yml` and change ports:
```yaml
ports:
  - "8090:80"  # Change 8090 to another port
```

### Backend Not Starting
Check logs:
```bash
docker compose logs cctv-app
```

Check .env file:
```bash
cat backend/.env
```

### Frontend Not Loading
Check nginx logs:
```bash
docker compose logs nginx
```

Check if frontend is built:
```bash
docker compose exec nginx ls -la /usr/share/nginx/html
```

### Database Issues
Check database file:
```bash
ls -la backend/data/cctv.db
```

Reset database (WARNING: deletes all data):
```bash
docker compose down
rm backend/data/cctv.db
docker compose up -d
```

## Production Deployment

### 1. Update Environment
```bash
cp backend/.env.example backend/.env
nano backend/.env
# Set production values
```

### 2. Build for Production
```bash
docker compose build
```

### 3. Run with SSL
Update `nginx.conf` to add SSL configuration and mount certificates:
```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
```

### 4. Use External Database (Optional)
Update backend to use PostgreSQL/MySQL instead of SQLite for better performance.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Docker Host                     │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │         Nginx (Port 8090)              │ │
│  │  - Serves Frontend                     │ │
│  │  - Reverse Proxy to Backend            │ │
│  └────────────────────────────────────────┘ │
│                    │                         │
│  ┌────────────────────────────────────────┐ │
│  │      CCTV App Container                │ │
│  │                                        │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  Golang Backend (Port 3001)      │ │ │
│  │  │  - REST API                      │ │ │
│  │  │  - SQLite Database               │ │ │
│  │  └──────────────────────────────────┘ │ │
│  │                                        │ │
│  │  ┌──────────────────────────────────┐ │ │
│  │  │  MediaMTX (Ports 8888/8889)      │ │ │
│  │  │  - HLS Streaming                 │ │ │
│  │  │  - WebRTC                        │ │ │
│  │  └──────────────────────────────────┘ │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Volumes:                                    │
│  - backend/data (SQLite)                     │
│  - recordings (Videos)                       │
│  - logs (Application logs)                   │
└─────────────────────────────────────────────┘
```

## Performance

### Resource Usage
- **Memory**: ~200MB (Backend + MediaMTX + Nginx)
- **CPU**: <5% idle, <20% under load
- **Disk**: Depends on recordings

### Optimization
1. Use external database for better performance
2. Use CDN for frontend assets
3. Enable Nginx caching
4. Use Redis for session storage

## Security

### Best Practices
1. Change default admin password
2. Use strong JWT secret
3. Enable HTTPS in production
4. Restrict MediaMTX API access
5. Use firewall rules
6. Regular security updates

### Environment Variables
Never commit `.env` files with sensitive data!

```bash
# Generate secure secrets
openssl rand -hex 32  # JWT_SECRET
openssl rand -hex 16  # CSRF_SECRET
```

## Monitoring

### Health Checks
Docker automatically monitors service health:
```bash
docker compose ps
```

### Logs
```bash
# Real-time logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100
```

### Metrics
Use Docker stats:
```bash
docker stats rafnet-cctv rafnet-cctv-nginx
```

## Backup

### Database Backup
```bash
# Backup
docker compose exec cctv-app cp /app/backend/data/cctv.db /app/backend/data/cctv.db.backup

# Or from host
cp backend/data/cctv.db backend/data/cctv.db.backup
```

### Full Backup
```bash
tar -czf cctv-backup-$(date +%Y%m%d).tar.gz \
  backend/data \
  recordings \
  logs \
  backend/.env \
  mediamtx/mediamtx.yml
```

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Check status: `docker compose ps`
- Restart services: `docker compose restart`
- Rebuild: `docker compose build --no-cache`

---

**Last Updated**: 2026-02-08  
**Docker Version**: 29.2.1  
**Compose Version**: 2.x
