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

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:3001
ARG VITE_FRONTEND_DOMAIN=localhost

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy rest of frontend files
COPY frontend/ ./

# Create .env file from build args
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env && \
    echo "VITE_FRONTEND_DOMAIN=${VITE_FRONTEND_DOMAIN}" >> .env

# Build with environment variables
RUN npm run build

# go2rtc from official image
FROM alexxit/go2rtc:latest AS go2rtc-image

# Final production image
FROM alpine:latest
WORKDIR /app

# Install runtime dependencies
RUN apk --no-cache add ca-certificates sqlite-libs tzdata ffmpeg

# Copy backend binary
COPY --from=backend-builder /app/backend/server ./backend/server
COPY backend/.env ./backend/.env

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy go2rtc
COPY --from=go2rtc-image /usr/local/bin/go2rtc ./go2rtc/go2rtc
COPY go2rtc/go2rtc.yaml ./go2rtc/go2rtc.yaml

# Create necessary directories
RUN mkdir -p backend/data recordings logs && \
    chmod 755 recordings && \
    chmod +x backend/server go2rtc/go2rtc

# Expose ports
EXPOSE 3001 8888 8555 1984

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
