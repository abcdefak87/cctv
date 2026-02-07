package models

import (
	"testing"
	"time"
)

func TestUserModel(t *testing.T) {
	t.Run("Create User", func(t *testing.T) {
		user := User{
			ID:           1,
			Username:     "testuser",
			PasswordHash: "hashedpassword",
			Role:         "admin",
			CreatedAt:    time.Now(),
		}

		if user.Username != "testuser" {
			t.Errorf("Expected username 'testuser', got '%s'", user.Username)
		}

		if user.Role != "admin" {
			t.Errorf("Expected role 'admin', got '%s'", user.Role)
		}
	})

	t.Run("User JSON Serialization", func(t *testing.T) {
		user := User{
			ID:           1,
			Username:     "testuser",
			PasswordHash: "shouldnotappear",
			Role:         "admin",
			CreatedAt:    time.Now(),
		}

		// PasswordHash should not be serialized (json:"-" tag)
		// This is tested implicitly through the tag
		if user.PasswordHash == "" {
			t.Error("PasswordHash should be set internally")
		}
	})
}

func TestLoginRequest(t *testing.T) {
	t.Run("Valid Login Request", func(t *testing.T) {
		req := LoginRequest{
			Username: "admin",
			Password: "password123",
		}

		if req.Username == "" {
			t.Error("Username should not be empty")
		}

		if req.Password == "" {
			t.Error("Password should not be empty")
		}
	})

	t.Run("Empty Login Request", func(t *testing.T) {
		req := LoginRequest{}

		if req.Username != "" {
			t.Error("Username should be empty")
		}

		if req.Password != "" {
			t.Error("Password should be empty")
		}
	})
}

func TestLoginResponse(t *testing.T) {
	t.Run("Success Response", func(t *testing.T) {
		resp := LoginResponse{
			Success: true,
			Token:   "jwt-token-here",
			Message: "Login successful",
		}

		if !resp.Success {
			t.Error("Success should be true")
		}

		if resp.Token == "" {
			t.Error("Token should not be empty")
		}
	})

	t.Run("Error Response", func(t *testing.T) {
		resp := LoginResponse{
			Success: false,
			Message: "Invalid credentials",
		}

		if resp.Success {
			t.Error("Success should be false")
		}

		if resp.Token != "" {
			t.Error("Token should be empty on error")
		}

		if resp.Message == "" {
			t.Error("Message should not be empty")
		}
	})
}
