# RAF NET CCTV - Multi-stage Docker Build (Golang Backend)

# Backend build stage
FROM golang:1.21-alpine AS backend-builder
WORKDIR /app/backend

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev sqlite-dev

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy source code
COPY backend/ ./

# Build binary
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o server ./cmd/server

# Frontend build stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/.env* ./
COPY frontend/ ./
RUN npm run build

# MediaMTX download stage
FROM alpine:latest AS mediamtx-downloader
RUN apk add --no-cache wget tar
WORKDIR /tmp
RUN wget https://github.com/bluenviron/mediamtx/releases/download/v1.9.0/mediamtx_v1.9.0_linux_amd64.tar.gz && \
    tar -xzf mediamtx_v1.9.0_linux_amd64.tar.gz && \
    chmod +x mediamtx

# Final production image
FROM alpine:latest
WORKDIR /app

# Install runtime dependencies
RUN apk --no-cache add ca-certificates sqlite-libs tzdata ffmpeg

# Copy backend binary
COPY --from=backend-builder /app/backend/server ./backend/server
COPY backend/.env.example ./backend/.env

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy MediaMTX
COPY --from=mediamtx-downloader /tmp/mediamtx ./mediamtx/mediamtx
COPY mediamtx/mediamtx.yml ./mediamtx/mediamtx.yml

# Create necessary directories
RUN mkdir -p backend/data recordings logs && \
    chmod 755 recordings && \
    chmod +x backend/server mediamtx/mediamtx

# Expose ports
EXPOSE 3001 8888 8889 9997

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
