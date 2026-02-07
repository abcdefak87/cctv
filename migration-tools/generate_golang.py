#!/usr/bin/env python3
"""
Golang Code Generator - Generate Golang code dari analisa backend Node.js
"""

import json
from pathlib import Path
from typing import Dict, List
from dataclasses import dataclass

@dataclass
class GoProject:
    module_name: str
    output_dir: Path

class GolangGenerator:
    def __init__(self, analysis_file: str, module_name: str = "github.com/yourusername/cctv-backend"):
        self.analysis_file = Path(analysis_file)
        self.module_name = module_name
        self.output_dir = Path("backend-go")
        
        # Load analysis result
        with open(self.analysis_file) as f:
            self.analysis = json.load(f)
    
    def generate_all(self):
        """Generate semua file Golang"""
        print("🚀 Generating Golang project...")
        
        self.create_directory_structure()
        self.generate_go_mod()
        self.generate_main()
        self.generate_config()
        self.generate_database()
        self.generate_models()
        self.generate_middleware()
        self.generate_handlers()
        self.generate_routes()
        self.generate_services()
        self.generate_dockerfile()
        self.generate_makefile()
        
        print("\n✅ Golang project generated successfully!")
        print(f"📁 Output directory: {self.output_dir}")
    
    def create_directory_structure(self):
        """Buat struktur direktori Golang"""
        dirs = [
            "cmd/server",
            "internal/config",
            "internal/database",
            "internal/models",
            "internal/middleware",
            "internal/handlers",
            "internal/routes",
            "internal/services",
            "internal/utils",
            "pkg/logger",
            "migrations",
        ]
        
        for dir_path in dirs:
            (self.output_dir / dir_path).mkdir(parents=True, exist_ok=True)
        
        print("  ✓ Created directory structure")
    
    def generate_go_mod(self):
        """Generate go.mod file"""
        content = f"""module {self.module_name}

go 1.21

require (
	github.com/gofiber/fiber/v2 v2.52.0
	github.com/golang-jwt/jwt/v5 v5.2.0
	github.com/mattn/go-sqlite3 v1.14.19
	github.com/joho/godotenv v1.5.1
	golang.org/x/crypto v0.18.0
	github.com/google/uuid v1.5.0
)
"""
        
        (self.output_dir / "go.mod").write_text(content)
        print("  ✓ Generated go.mod")
    
    def generate_main(self):
        """Generate main.go"""
        content = '''package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"''' + self.module_name + '''/internal/config"
	"''' + self.module_name + '''/internal/database"
	"''' + self.module_name + '''/internal/routes"
	"''' + self.module_name + '''/pkg/logger"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Load configuration
	cfg := config.Load()
	
	// Initialize logger
	logger.Init(cfg.Server.Env)
	
	// Initialize database
	db, err := database.Connect(cfg.Database.Path)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	
	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	
	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: customErrorHandler,
		BodyLimit:    1 * 1024 * 1024, // 1MB
	})
	
	// Global middleware
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.Security.AllowedOrigins,
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-API-Key, X-CSRF-Token",
		AllowMethods:     "GET, POST, PUT, DELETE, PATCH, OPTIONS",
	}))
	
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"env":    cfg.Server.Env,
		})
	})
	
	// Setup routes
	routes.Setup(app, db, cfg)
	
	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		
		logger.Info("Shutting down gracefully...")
		app.Shutdown()
	}()
	
	// Start server
	addr := cfg.Server.Host + ":" + cfg.Server.Port
	logger.Info("Server starting on " + addr)
	
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"message": err.Error(),
	})
}
'''
        
        (self.output_dir / "cmd/server/main.go").write_text(content)
        print("  ✓ Generated main.go")
    
    def generate_config(self):
        """Generate config package"""
        content = '''package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Security SecurityConfig
	MediaMTX MediaMTXConfig
}

type ServerConfig struct {
	Host string
	Port string
	Env  string
}

type DatabaseConfig struct {
	Path string
}

type JWTConfig struct {
	Secret     string
	Expiration string
}

type SecurityConfig struct {
	AllowedOrigins       string
	APIKeySecret         string
	CSRFSecret           string
	RateLimitPublic      int
	RateLimitAuth        int
	MaxLoginAttempts     int
	LockoutDurationMins  int
}

type MediaMTXConfig struct {
	APIURL     string
	HLSURLInternal string
	HLSURLPublic   string
}

func Load() *Config {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
	
	return &Config{
		Server: ServerConfig{
			Host: getEnv("HOST", "0.0.0.0"),
			Port: getEnv("PORT", "3000"),
			Env:  getEnv("NODE_ENV", "development"),
		},
		Database: DatabaseConfig{
			Path: getEnv("DATABASE_PATH", "./data/cctv.db"),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "change-this-secret"),
			Expiration: getEnv("JWT_EXPIRATION", "1h"),
		},
		Security: SecurityConfig{
			AllowedOrigins:      getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
			APIKeySecret:        getEnv("API_KEY_SECRET", ""),
			CSRFSecret:          getEnv("CSRF_SECRET", ""),
			RateLimitPublic:     getEnvInt("RATE_LIMIT_PUBLIC", 100),
			RateLimitAuth:       getEnvInt("RATE_LIMIT_AUTH", 30),
			MaxLoginAttempts:    getEnvInt("MAX_LOGIN_ATTEMPTS", 5),
			LockoutDurationMins: getEnvInt("LOCKOUT_DURATION_MINUTES", 30),
		},
		MediaMTX: MediaMTXConfig{
			APIURL:         getEnv("MEDIAMTX_API_URL", "http://localhost:9997"),
			HLSURLInternal: getEnv("MEDIAMTX_HLS_URL_INTERNAL", "http://localhost:8888"),
			HLSURLPublic:   getEnv("PUBLIC_HLS_PATH", "/hls"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
'''
        
        (self.output_dir / "internal/config/config.go").write_text(content)
        print("  ✓ Generated config.go")
    
    def generate_database(self):
        """Generate database package"""
        content = '''package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

func Connect(dbPath string) (*sql.DB, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}
	
	// Open database
	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on&_journal_mode=WAL")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}
	
	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	
	return db, nil
}

func RunMigrations(db *sql.DB) error {
	// Create tables if not exists
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT DEFAULT 'admin',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS areas (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			description TEXT,
			rt TEXT,
			rw TEXT,
			kelurahan TEXT,
			kecamatan TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS cameras (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			private_rtsp_url TEXT NOT NULL,
			description TEXT,
			location TEXT,
			group_name TEXT,
			area_id INTEGER,
			enabled INTEGER DEFAULT 1,
			stream_key TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
		)`,
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER,
			action TEXT NOT NULL,
			details TEXT,
			ip_address TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
		)`,
		`CREATE TABLE IF NOT EXISTS feedbacks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			email TEXT,
			message TEXT NOT NULL,
			status TEXT DEFAULT 'unread',
			ip_address TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}
	
	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}
	
	return nil
}
'''
        
        (self.output_dir / "internal/database/database.go").write_text(content)
        print("  ✓ Generated database.go")
    
    def generate_models(self):
        """Generate models dari database tables"""
        tables = self.analysis.get("database_tables", [])
        
        models_map = {
            "users": '''package models

import "time"

type User struct {
	ID           int       `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Token   string `json:"token,omitempty"`
	Message string `json:"message,omitempty"`
}
''',
            "cameras": '''package models

import "time"

type Camera struct {
	ID             int       `json:"id" db:"id"`
	Name           string    `json:"name" db:"name"`
	PrivateRTSPURL string    `json:"private_rtsp_url,omitempty" db:"private_rtsp_url"`
	Description    string    `json:"description" db:"description"`
	Location       string    `json:"location" db:"location"`
	GroupName      string    `json:"group_name" db:"group_name"`
	AreaID         *int      `json:"area_id" db:"area_id"`
	Enabled        bool      `json:"enabled" db:"enabled"`
	StreamKey      string    `json:"stream_key" db:"stream_key"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
''',
        }
        
        # Generate user model
        (self.output_dir / "internal/models/user.go").write_text(models_map.get("users", ""))
        
        # Generate camera model
        (self.output_dir / "internal/models/camera.go").write_text(models_map.get("cameras", ""))
        
        print(f"  ✓ Generated {len(models_map)} model files")
    
    def generate_middleware(self):
        """Generate middleware"""
        # Auth middleware
        auth_content = '''package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func AuthMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get token from header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			// Try cookie
			token := c.Cookies("token")
			if token == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"success": false,
					"message": "Unauthorized - No token provided",
				})
			}
			authHeader = "Bearer " + token
		}
		
		// Extract token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid authorization header",
			})
		}
		
		tokenString := parts[1]
		
		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid or expired token",
			})
		}
		
		// Store claims in context
		if claims, ok := token.Claims.(*JWTClaims); ok {
			c.Locals("user_id", claims.UserID)
			c.Locals("username", claims.Username)
			c.Locals("role", claims.Role)
		}
		
		return c.Next()
	}
}
'''
        
        (self.output_dir / "internal/middleware/auth.go").write_text(auth_content)
        print("  ✓ Generated middleware")
    
    def generate_handlers(self):
        """Generate handlers dari controllers"""
        # Auth handler
        auth_handler = '''package handlers

import (
	"database/sql"
	"time"

	"''' + self.module_name + '''/internal/config"
	"''' + self.module_name + '''/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewAuthHandler(db *sql.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}
	
	// Get user from database
	var user models.User
	err := h.db.QueryRow(
		"SELECT id, username, password_hash, role FROM users WHERE username = ?",
		req.Username,
	).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.Role)
	
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Invalid credentials",
		})
	}
	
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Database error",
		})
	}
	
	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Invalid credentials",
		})
	}
	
	// Generate JWT token
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.cfg.JWT.Secret))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to generate token",
		})
	}
	
	// Set cookie
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    tokenString,
		HTTPOnly: true,
		Secure:   h.cfg.Server.Env == "production",
		SameSite: "Lax",
		MaxAge:   86400, // 24 hours
	})
	
	return c.JSON(fiber.Map{
		"success": true,
		"token":   tokenString,
		"user": fiber.Map{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
		},
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    "",
		HTTPOnly: true,
		MaxAge:   -1,
	})
	
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Logged out successfully",
	})
}

func (h *AuthHandler) Verify(c *fiber.Ctx) error {
	userID := c.Locals("user_id")
	username := c.Locals("username")
	role := c.Locals("role")
	
	return c.JSON(fiber.Map{
		"success": true,
		"user": fiber.Map{
			"id":       userID,
			"username": username,
			"role":     role,
		},
	})
}
'''
        
        (self.output_dir / "internal/handlers/auth.go").write_text(auth_handler)
        print("  ✓ Generated handlers")
    
    def generate_routes(self):
        """Generate routes setup"""
        content = '''package routes

import (
	"database/sql"

	"''' + self.module_name + '''/internal/config"
	"''' + self.module_name + '''/internal/handlers"
	"''' + self.module_name + '''/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func Setup(app *fiber.App, db *sql.DB, cfg *config.Config) {
	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	
	// API routes
	api := app.Group("/api")
	
	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	
	// Protected routes
	authMiddleware := middleware.AuthMiddleware(cfg.JWT.Secret)
	auth.Get("/verify", authMiddleware, authHandler.Verify)
	
	// TODO: Add more routes here
	// cameras := api.Group("/cameras", authMiddleware)
	// areas := api.Group("/areas", authMiddleware)
	// etc...
}
'''
        
        (self.output_dir / "internal/routes/routes.go").write_text(content)
        print("  ✓ Generated routes.go")
    
    def generate_services(self):
        """Generate services"""
        logger_content = '''package logger

import (
	"log"
	"os"
)

var (
	infoLogger  *log.Logger
	errorLogger *log.Logger
)

func Init(env string) {
	infoLogger = log.New(os.Stdout, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile)
	errorLogger = log.New(os.Stderr, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)
}

func Info(v ...interface{}) {
	infoLogger.Println(v...)
}

func Error(v ...interface{}) {
	errorLogger.Println(v...)
}
'''
        
        (self.output_dir / "pkg/logger/logger.go").write_text(logger_content)
        print("  ✓ Generated services")
    
    def generate_dockerfile(self):
        """Generate Dockerfile untuk Golang"""
        content = '''# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates sqlite-libs

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/server .

# Copy .env if exists
COPY .env* ./

# Expose port
EXPOSE 3000

CMD ["./server"]
'''
        
        (self.output_dir / "Dockerfile").write_text(content)
        print("  ✓ Generated Dockerfile")
    
    def generate_makefile(self):
        """Generate Makefile"""
        content = '''# Makefile for Golang CCTV Backend

.PHONY: help build run test clean docker-build docker-run

help:
	@echo "Available commands:"
	@echo "  make build        - Build the application"
	@echo "  make run          - Run the application"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"

build:
	go build -o bin/server ./cmd/server

run:
	go run ./cmd/server/main.go

test:
	go test -v ./...

clean:
	rm -rf bin/
	go clean

docker-build:
	docker build -t cctv-backend-go .

docker-run:
	docker run -p 3000:3000 --env-file .env cctv-backend-go

deps:
	go mod download
	go mod tidy

fmt:
	go fmt ./...

lint:
	golangci-lint run
'''
        
        (self.output_dir / "Makefile").write_text(content)
        print("  ✓ Generated Makefile")

def main():
    import sys
    
    analysis_file = "migration-tools/analysis_result.json"
    module_name = "github.com/yourusername/cctv-backend"
    
    if len(sys.argv) > 1:
        module_name = sys.argv[1]
    
    if not Path(analysis_file).exists():
        print(f"❌ Analysis file not found: {analysis_file}")
        print("   Run analyze_backend.py first!")
        return
    
    generator = GolangGenerator(analysis_file, module_name)
    generator.generate_all()
    
    print("\n" + "="*60)
    print("📝 NEXT STEPS:")
    print("="*60)
    print("1. cd backend-go")
    print("2. go mod tidy")
    print("3. Copy .env from backend/ to backend-go/")
    print("4. go run cmd/server/main.go")
    print("\nOr using Docker:")
    print("1. cd backend-go")
    print("2. make docker-build")
    print("3. make docker-run")
    print("="*60)

if __name__ == "__main__":
    main()
