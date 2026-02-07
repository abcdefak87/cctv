package handlers

import (
	"database/sql"
	"time"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/abcdefak87/cctv/internal/models"
	"golang.org/x/crypto/bcrypt"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewUserHandler(db *sql.DB, cfg *config.Config) *UserHandler {
	return &UserHandler{db: db, cfg: cfg}
}

// GetAllUsers - Get all users (admin only)
func (h *UserHandler) GetAllUsers(c *fiber.Ctx) error {
	rows, err := h.db.Query(`
		SELECT id, username, email, role, created_at, updated_at
		FROM users
		ORDER BY id ASC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch users",
		})
	}
	defer rows.Close()

	users := []map[string]interface{}{}
	for rows.Next() {
		var user models.User

		err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			continue
		}

		users = append(users, map[string]interface{}{
			"id":         user.ID,
			"username":   user.Username,
			"email":      user.Email,
			"role":       user.Role,
			"created_at": user.CreatedAt,
			"updated_at": user.UpdatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    users,
	})
}

// GetUser - Get single user by ID
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	err := h.db.QueryRow(`
		SELECT id, username, email, role, created_at, updated_at
		FROM users WHERE id = ?
	`, id).Scan(&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "User not found",
		})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch user",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"id":         user.ID,
			"username":   user.Username,
			"email":      user.Email,
			"role":       user.Role,
			"created_at": user.CreatedAt,
			"updated_at": user.UpdatedAt,
		},
	})
}

// CreateUser - Create new user
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// Validation
	if req.Username == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Username and password are required",
		})
	}

	if req.Role == "" {
		req.Role = "user"
	}

	// Check if username exists
	var exists int
	err := h.db.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", req.Username).Scan(&exists)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to check username",
		})
	}

	if exists > 0 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Username already exists",
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to hash password",
		})
	}

	result, err := h.db.Exec(`
		INSERT INTO users (username, email, password, role, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, req.Username, req.Email, string(hashedPassword), req.Role, time.Now())

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create user",
		})
	}

	id, _ := result.LastInsertId()

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "User created successfully",
		"data": fiber.Map{
			"id": id,
		},
	})
}

// UpdateUser - Update existing user
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// If password is provided, hash it
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"message": "Failed to hash password",
			})
		}

		_, err = h.db.Exec(`
			UPDATE users 
			SET username = ?, email = ?, password = ?, role = ?, updated_at = ?
			WHERE id = ?
		`, req.Username, req.Email, string(hashedPassword), req.Role, time.Now(), id)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"message": "Failed to update user",
			})
		}
	} else {
		_, err := h.db.Exec(`
			UPDATE users 
			SET username = ?, email = ?, role = ?, updated_at = ?
			WHERE id = ?
		`, req.Username, req.Email, req.Role, time.Now(), id)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"message": "Failed to update user",
			})
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User updated successfully",
	})
}

// DeleteUser - Delete user
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	// Prevent deleting the last admin
	var adminCount int
	err := h.db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&adminCount)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to check admin count",
		})
	}

	var role string
	err = h.db.QueryRow("SELECT role FROM users WHERE id = ?", id).Scan(&role)
	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "User not found",
		})
	}

	if role == "admin" && adminCount <= 1 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Cannot delete the last admin user",
		})
	}

	result, err := h.db.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to delete user",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "User not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "User deleted successfully",
	})
}

// ChangePassword - Change user password
func (h *UserHandler) ChangePassword(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	if req.OldPassword == "" || req.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Old and new passwords are required",
		})
	}

	// Get current password
	var currentPassword string
	err := h.db.QueryRow("SELECT password FROM users WHERE id = ?", id).Scan(&currentPassword)
	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "User not found",
		})
	}

	// Verify old password
	err = bcrypt.CompareHashAndPassword([]byte(currentPassword), []byte(req.OldPassword))
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"message": "Invalid old password",
		})
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to hash password",
		})
	}

	_, err = h.db.Exec("UPDATE users SET password = ?, updated_at = ? WHERE id = ?",
		string(hashedPassword), time.Now(), id)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update password",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Password changed successfully",
	})
}
