package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func TestAuthMiddleware(t *testing.T) {
	secret := "test-secret"

	t.Run("Valid token in header", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/test", func(c *fiber.Ctx) error {
			userID := c.Locals("user_id")
			if userID == nil {
				t.Error("user_id should be set in locals")
			}
			return c.SendString("OK")
		})

		// Create valid token
		claims := jwt.MapClaims{
			"user_id":  1,
			"username": "testuser",
			"role":     "admin",
			"exp":      time.Now().Add(time.Hour).Unix(),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(secret))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 200 {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}
	})

	t.Run("Missing token", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/test", func(c *fiber.Ctx) error {
			return c.SendString("OK")
		})

		req := httptest.NewRequest("GET", "/test", nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 401 {
			t.Errorf("Expected status 401, got %d", resp.StatusCode)
		}
	})

	t.Run("Invalid token format", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/test", func(c *fiber.Ctx) error {
			return c.SendString("OK")
		})

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "InvalidFormat token")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 401 {
			t.Errorf("Expected status 401, got %d", resp.StatusCode)
		}
	})

	t.Run("Expired token", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/test", func(c *fiber.Ctx) error {
			return c.SendString("OK")
		})

		// Create expired token
		claims := jwt.MapClaims{
			"user_id":  1,
			"username": "testuser",
			"role":     "admin",
			"exp":      time.Now().Add(-time.Hour).Unix(), // Expired 1 hour ago
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(secret))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 401 {
			t.Errorf("Expected status 401 for expired token, got %d", resp.StatusCode)
		}
	})

	t.Run("Invalid signature", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/test", func(c *fiber.Ctx) error {
			return c.SendString("OK")
		})

		// Create token with different secret
		claims := jwt.MapClaims{
			"user_id":  1,
			"username": "testuser",
			"role":     "admin",
			"exp":      time.Now().Add(time.Hour).Unix(),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte("wrong-secret"))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 401 {
			t.Errorf("Expected status 401 for invalid signature, got %d", resp.StatusCode)
		}
	})

	t.Run("Token in cookie", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/test", func(c *fiber.Ctx) error {
			userID := c.Locals("user_id")
			if userID == nil {
				t.Error("user_id should be set in locals")
			}
			return c.SendString("OK")
		})

		// Create valid token
		claims := jwt.MapClaims{
			"user_id":  1,
			"username": "testuser",
			"role":     "admin",
			"exp":      time.Now().Add(time.Hour).Unix(),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(secret))

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Cookie", "token="+tokenString)

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 200 {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}
	})
}

func TestJWTClaims(t *testing.T) {
	t.Run("Create claims", func(t *testing.T) {
		claims := JWTClaims{
			UserID:   1,
			Username: "testuser",
			Role:     "admin",
		}

		if claims.UserID != 1 {
			t.Errorf("Expected UserID 1, got %d", claims.UserID)
		}

		if claims.Username != "testuser" {
			t.Errorf("Expected username 'testuser', got '%s'", claims.Username)
		}

		if claims.Role != "admin" {
			t.Errorf("Expected role 'admin', got '%s'", claims.Role)
		}
	})
}
