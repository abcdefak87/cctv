package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/abcdefak87/cctv/internal/models"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	_ "github.com/mattn/go-sqlite3"
)

func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	// Create users table
	_, err = db.Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT DEFAULT 'admin',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		t.Fatalf("Failed to create users table: %v", err)
	}

	return db
}

func TestAuthHandler_Login(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:     "test-secret",
			Expiration: "24h",
		},
		Server: config.ServerConfig{
			Env: "test",
		},
	}

	handler := NewAuthHandler(db, cfg)

	t.Run("Successful login", func(t *testing.T) {
		// Create test user
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), 10)
		_, err := db.Exec("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
			"testuser", string(hashedPassword), "admin")
		if err != nil {
			t.Fatalf("Failed to create test user: %v", err)
		}

		app := fiber.New()
		app.Post("/login", handler.Login)

		reqBody := models.LoginRequest{
			Username: "testuser",
			Password: "password123",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 200 {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var response models.LoginResponse
		json.NewDecoder(resp.Body).Decode(&response)

		if !response.Success {
			t.Error("Expected success to be true")
		}

		if response.Token == "" {
			t.Error("Expected token to be present")
		}

		// Cleanup
		db.Exec("DELETE FROM users WHERE username = ?", "testuser")
	})

	t.Run("Invalid credentials", func(t *testing.T) {
		app := fiber.New()
		app.Post("/login", handler.Login)

		reqBody := models.LoginRequest{
			Username: "nonexistent",
			Password: "wrongpassword",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 401 {
			t.Errorf("Expected status 401, got %d", resp.StatusCode)
		}

		var response models.LoginResponse
		json.NewDecoder(resp.Body).Decode(&response)

		if response.Success {
			t.Error("Expected success to be false")
		}

		if response.Token != "" {
			t.Error("Expected token to be empty")
		}
	})

	t.Run("Invalid request body", func(t *testing.T) {
		app := fiber.New()
		app.Post("/login", handler.Login)

		req := httptest.NewRequest("POST", "/login", bytes.NewReader([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 400 {
			t.Errorf("Expected status 400, got %d", resp.StatusCode)
		}
	})

	t.Run("Wrong password", func(t *testing.T) {
		// Create test user
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("correctpassword"), 10)
		_, err := db.Exec("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
			"testuser2", string(hashedPassword), "admin")
		if err != nil {
			t.Fatalf("Failed to create test user: %v", err)
		}

		app := fiber.New()
		app.Post("/login", handler.Login)

		reqBody := models.LoginRequest{
			Username: "testuser2",
			Password: "wrongpassword",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 401 {
			t.Errorf("Expected status 401, got %d", resp.StatusCode)
		}

		// Cleanup
		db.Exec("DELETE FROM users WHERE username = ?", "testuser2")
	})
}

func TestAuthHandler_Logout(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret: "test-secret",
		},
		Server: config.ServerConfig{
			Env: "test",
		},
	}

	handler := NewAuthHandler(db, cfg)

	t.Run("Successful logout", func(t *testing.T) {
		app := fiber.New()
		app.Post("/logout", handler.Logout)

		req := httptest.NewRequest("POST", "/logout", nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 200 {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		if !response["success"].(bool) {
			t.Error("Expected success to be true")
		}
	})
}

func TestAuthHandler_Verify(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret: "test-secret",
		},
	}

	handler := NewAuthHandler(db, cfg)

	t.Run("Verify with user context", func(t *testing.T) {
		app := fiber.New()
		app.Get("/verify", func(c *fiber.Ctx) error {
			// Simulate auth middleware setting locals
			c.Locals("user_id", 1)
			c.Locals("username", "testuser")
			c.Locals("role", "admin")
			return handler.Verify(c)
		})

		req := httptest.NewRequest("GET", "/verify", nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}

		if resp.StatusCode != 200 {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		if !response["success"].(bool) {
			t.Error("Expected success to be true")
		}

		user := response["user"].(map[string]interface{})
		if user["username"] != "testuser" {
			t.Errorf("Expected username 'testuser', got '%v'", user["username"])
		}
	})
}

func TestNewAuthHandler(t *testing.T) {
	t.Run("Create auth handler", func(t *testing.T) {
		db := setupTestDB(t)
		defer db.Close()

		cfg := &config.Config{
			JWT: config.JWTConfig{
				Secret: "test-secret",
			},
		}

		handler := NewAuthHandler(db, cfg)

		if handler == nil {
			t.Error("Handler should not be nil")
		}

		if handler.db == nil {
			t.Error("Handler db should not be nil")
		}

		if handler.cfg == nil {
			t.Error("Handler cfg should not be nil")
		}
	})
}
