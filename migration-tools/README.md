# Migration Tools: Node.js to Golang

Tools untuk migrasi backend CCTV dari Node.js (Fastify) ke Golang (Fiber).

## 🎯 Overview

Project ini menyediakan 2 tools utama:

1. **analyze_backend.py** - Menganalisa struktur backend Node.js
2. **generate_golang.py** - Generate skeleton code Golang dari hasil analisa

## 📋 Prerequisites

```bash
# Python 3.8+
python3 --version

# Golang 1.21+ (untuk menjalankan hasil generate)
go version
```

## 🚀 Quick Start

### Step 1: Analisa Backend Node.js

```bash
cd migration-tools
python3 analyze_backend.py
```

Output:
- `analysis_result.json` - Hasil analisa dalam format JSON
- Summary di console

### Step 2: Generate Golang Code

```bash
python3 generate_golang.py github.com/yourusername/cctv-backend
```

Output:
- Direktori `backend-go/` dengan struktur project Golang lengkap

### Step 3: Setup Golang Project

```bash
cd backend-go

# Install dependencies
go mod tidy

# Copy environment variables
cp ../backend/.env .env

# Run the server
go run cmd/server/main.go
```

## 📁 Struktur Output Golang

```
backend-go/
├── cmd/
│   └── server/
│       └── main.go              # Entry point
├── internal/
│   ├── config/
│   │   └── config.go            # Configuration management
│   ├── database/
│   │   └── database.go          # Database connection & migrations
│   ├── models/
│   │   ├── user.go              # User model
│   │   └── camera.go            # Camera model
│   ├── middleware/
│   │   └── auth.go              # JWT authentication
│   ├── handlers/
│   │   └── auth.go              # HTTP handlers
│   ├── routes/
│   │   └── routes.go            # Route definitions
│   └── services/
│       └── ...                  # Business logic
├── pkg/
│   └── logger/
│       └── logger.go            # Logging utility
├── migrations/
│   └── ...                      # SQL migrations
├── go.mod                       # Go modules
├── Dockerfile                   # Docker build
└── Makefile                     # Build commands
```

## 🔍 Analisa Backend

Tool `analyze_backend.py` menganalisa:

### ✅ Routes
- HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Path patterns
- Handler functions
- Middleware chains

### ✅ Controllers
- Semua controller files
- Exported functions
- Function signatures

### ✅ Middleware
- Security middleware
- Authentication
- Rate limiting
- CSRF protection
- Input sanitization

### ✅ Services
- Business logic services
- External integrations
- Background jobs

### ✅ Database
- Table schemas
- Relationships
- Indexes

### ✅ Dependencies
- NPM packages
- Mapping ke Golang equivalents

## 🏗️ Golang Stack

Generated code menggunakan:

| Node.js | Golang |
|---------|--------|
| Fastify | Fiber v2 |
| better-sqlite3 | mattn/go-sqlite3 |
| jsonwebtoken | golang-jwt/jwt |
| bcrypt | golang.org/x/crypto/bcrypt |
| dotenv | joho/godotenv |
| axios | net/http (standard) |

## 📝 Manual Migration Tasks

Beberapa hal yang perlu di-migrate manual:

### 1. Complex Business Logic
```javascript
// Node.js
const result = await complexCalculation(data);

// Golang - perlu implement manual
result := complexCalculation(data)
```

### 2. External Service Integrations
- MediaMTX API calls
- Telegram bot
- Saweria integration
- Recording service

### 3. WebSocket/Streaming
- HLS proxy
- WebRTC signaling
- Real-time viewer tracking

### 4. Background Jobs
- Camera health checks
- Thumbnail generation
- Session cleanup
- Audit log rotation

## 🔧 Customization

### Modify Analysis

Edit `analyze_backend.py`:

```python
# Tambah pattern untuk route detection
route_patterns = [
    r"fastify\.(get|post|put|delete|patch)\(['\"]([^'\"]+)['\"]",
    r"your_custom_pattern_here",
]
```

### Modify Generation

Edit `generate_golang.py`:

```python
# Customize template
def generate_custom_handler(self):
    content = '''
    // Your custom Golang code template
    '''
    self.write_file("path/to/file.go", content)
```

## 🐳 Docker Deployment

```bash
cd backend-go

# Build image
make docker-build

# Run container
make docker-run

# Or manual
docker build -t cctv-backend-go .
docker run -p 3000:3000 --env-file .env cctv-backend-go
```

## 🧪 Testing

```bash
cd backend-go

# Run tests
go test -v ./...

# With coverage
go test -v -cover ./...

# Benchmark
go test -bench=. ./...
```

## 📊 Performance Comparison

Expected improvements dengan Golang:

| Metric | Node.js | Golang | Improvement |
|--------|---------|--------|-------------|
| Memory | ~150MB | ~20MB | 7.5x |
| Startup | ~2s | ~0.1s | 20x |
| Req/sec | ~5k | ~50k | 10x |
| Latency p99 | ~100ms | ~10ms | 10x |

*Note: Actual results may vary based on workload*

## 🔐 Security Considerations

Generated code includes:

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS configuration
- ✅ Rate limiting (TODO: implement)
- ✅ Input validation (TODO: implement)
- ✅ SQL injection prevention (prepared statements)
- ✅ XSS protection (TODO: implement)

## 📚 Additional Resources

### Golang Learning
- [Go by Example](https://gobyexample.com/)
- [Effective Go](https://golang.org/doc/effective_go)
- [Fiber Documentation](https://docs.gofiber.io/)

### Migration Guides
- [Node.js to Go Migration](https://github.com/golang/go/wiki/FromXToGo)
- [Fastify to Fiber](https://docs.gofiber.io/guide/migration)

## 🤝 Contributing

Untuk improve migration tools:

1. Fork repository
2. Create feature branch
3. Add improvements
4. Submit pull request

## 📄 License

MIT License - feel free to use and modify

## 🆘 Troubleshooting

### Issue: "go.mod not found"
```bash
cd backend-go
go mod init github.com/yourusername/cctv-backend
go mod tidy
```

### Issue: "CGO_ENABLED required for sqlite3"
```bash
CGO_ENABLED=1 go build ./cmd/server
```

### Issue: "Port already in use"
```bash
# Change port in .env
PORT=3001

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

## 📞 Support

Jika ada pertanyaan atau issue:
1. Check documentation
2. Review generated code
3. Open GitHub issue
4. Contact maintainer

---

**Happy Migrating! 🚀**
