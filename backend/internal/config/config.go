package config

import (
	"log"
	"os"
	"strconv"

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
