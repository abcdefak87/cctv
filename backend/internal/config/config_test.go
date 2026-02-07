package config

import (
	"os"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	t.Run("Load with defaults", func(t *testing.T) {
		// Clear environment variables
		os.Clearenv()

		cfg := Load()

		if cfg.Server.Host != "0.0.0.0" {
			t.Errorf("Expected default host '0.0.0.0', got '%s'", cfg.Server.Host)
		}

		if cfg.Server.Port != "3000" {
			t.Errorf("Expected default port '3000', got '%s'", cfg.Server.Port)
		}

		if cfg.Server.Env != "development" {
			t.Errorf("Expected default env 'development', got '%s'", cfg.Server.Env)
		}
	})

	t.Run("Load with environment variables", func(t *testing.T) {
		os.Setenv("HOST", "127.0.0.1")
		os.Setenv("PORT", "8080")
		os.Setenv("NODE_ENV", "production")
		os.Setenv("JWT_SECRET", "test-secret")
		os.Setenv("DATABASE_PATH", "/tmp/test.db")

		cfg := Load()

		if cfg.Server.Host != "127.0.0.1" {
			t.Errorf("Expected host '127.0.0.1', got '%s'", cfg.Server.Host)
		}

		if cfg.Server.Port != "8080" {
			t.Errorf("Expected port '8080', got '%s'", cfg.Server.Port)
		}

		if cfg.Server.Env != "production" {
			t.Errorf("Expected env 'production', got '%s'", cfg.Server.Env)
		}

		if cfg.JWT.Secret != "test-secret" {
			t.Errorf("Expected JWT secret 'test-secret', got '%s'", cfg.JWT.Secret)
		}

		if cfg.Database.Path != "/tmp/test.db" {
			t.Errorf("Expected database path '/tmp/test.db', got '%s'", cfg.Database.Path)
		}

		// Cleanup
		os.Clearenv()
	})

	t.Run("Security config with integers", func(t *testing.T) {
		os.Setenv("RATE_LIMIT_PUBLIC", "200")
		os.Setenv("RATE_LIMIT_AUTH", "50")
		os.Setenv("MAX_LOGIN_ATTEMPTS", "10")
		os.Setenv("LOCKOUT_DURATION_MINUTES", "60")

		cfg := Load()

		if cfg.Security.RateLimitPublic != 200 {
			t.Errorf("Expected rate limit 200, got %d", cfg.Security.RateLimitPublic)
		}

		if cfg.Security.RateLimitAuth != 50 {
			t.Errorf("Expected auth rate limit 50, got %d", cfg.Security.RateLimitAuth)
		}

		if cfg.Security.MaxLoginAttempts != 10 {
			t.Errorf("Expected max login attempts 10, got %d", cfg.Security.MaxLoginAttempts)
		}

		if cfg.Security.LockoutDurationMins != 60 {
			t.Errorf("Expected lockout duration 60, got %d", cfg.Security.LockoutDurationMins)
		}

		// Cleanup
		os.Clearenv()
	})

	t.Run("MediaMTX config", func(t *testing.T) {
		os.Setenv("MEDIAMTX_API_URL", "http://mediamtx:9997")
		os.Setenv("MEDIAMTX_HLS_URL_INTERNAL", "http://mediamtx:8888")
		os.Setenv("PUBLIC_HLS_PATH", "/streams/hls")

		cfg := Load()

		if cfg.MediaMTX.APIURL != "http://mediamtx:9997" {
			t.Errorf("Expected MediaMTX API URL 'http://mediamtx:9997', got '%s'", cfg.MediaMTX.APIURL)
		}

		if cfg.MediaMTX.HLSURLInternal != "http://mediamtx:8888" {
			t.Errorf("Expected HLS URL 'http://mediamtx:8888', got '%s'", cfg.MediaMTX.HLSURLInternal)
		}

		if cfg.MediaMTX.HLSURLPublic != "/streams/hls" {
			t.Errorf("Expected public HLS path '/streams/hls', got '%s'", cfg.MediaMTX.HLSURLPublic)
		}

		// Cleanup
		os.Clearenv()
	})
}

func TestGetEnv(t *testing.T) {
	t.Run("Get existing env", func(t *testing.T) {
		os.Setenv("TEST_VAR", "test-value")
		value := getEnv("TEST_VAR", "default")

		if value != "test-value" {
			t.Errorf("Expected 'test-value', got '%s'", value)
		}

		os.Unsetenv("TEST_VAR")
	})

	t.Run("Get non-existing env with default", func(t *testing.T) {
		value := getEnv("NON_EXISTING_VAR", "default-value")

		if value != "default-value" {
			t.Errorf("Expected 'default-value', got '%s'", value)
		}
	})

	t.Run("Get empty env with default", func(t *testing.T) {
		os.Setenv("EMPTY_VAR", "")
		value := getEnv("EMPTY_VAR", "default")

		if value != "default" {
			t.Errorf("Expected 'default', got '%s'", value)
		}

		os.Unsetenv("EMPTY_VAR")
	})
}

func TestGetEnvInt(t *testing.T) {
	t.Run("Get valid integer", func(t *testing.T) {
		os.Setenv("INT_VAR", "42")
		value := getEnvInt("INT_VAR", 10)

		if value != 42 {
			t.Errorf("Expected 42, got %d", value)
		}

		os.Unsetenv("INT_VAR")
	})

	t.Run("Get invalid integer returns default", func(t *testing.T) {
		os.Setenv("INVALID_INT", "not-a-number")
		value := getEnvInt("INVALID_INT", 100)

		if value != 100 {
			t.Errorf("Expected default 100, got %d", value)
		}

		os.Unsetenv("INVALID_INT")
	})

	t.Run("Get non-existing integer returns default", func(t *testing.T) {
		value := getEnvInt("NON_EXISTING_INT", 50)

		if value != 50 {
			t.Errorf("Expected default 50, got %d", value)
		}
	})

	t.Run("Get zero integer", func(t *testing.T) {
		os.Setenv("ZERO_INT", "0")
		value := getEnvInt("ZERO_INT", 10)

		if value != 0 {
			t.Errorf("Expected 0, got %d", value)
		}

		os.Unsetenv("ZERO_INT")
	})
}
