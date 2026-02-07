package handlers

import (
	"database/sql"
	"time"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/gofiber/fiber/v2"
)

type FeedbackHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewFeedbackHandler(db *sql.DB, cfg *config.Config) *FeedbackHandler {
	return &FeedbackHandler{db: db, cfg: cfg}
}

// GetAllFeedback - Get all feedback (admin only)
func (h *FeedbackHandler) GetAllFeedback(c *fiber.Ctx) error {
	status := c.Query("status", "")
	
	query := `
		SELECT id, name, email, message, status, created_at, updated_at
		FROM feedback
	`
	
	args := []interface{}{}
	if status != "" {
		query += " WHERE status = ?"
		args = append(args, status)
	}
	
	query += " ORDER BY created_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch feedback",
		})
	}
	defer rows.Close()

	feedbacks := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var name, email, message, status string
		var createdAt, updatedAt time.Time

		err := rows.Scan(&id, &name, &email, &message, &status, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		feedbacks = append(feedbacks, map[string]interface{}{
			"id":         id,
			"name":       name,
			"email":      email,
			"message":    message,
			"status":     status,
			"created_at": createdAt,
			"updated_at": updatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    feedbacks,
	})
}

// GetFeedback - Get single feedback by ID
func (h *FeedbackHandler) GetFeedback(c *fiber.Ctx) error {
	id := c.Params("id")

	var feedbackID int
	var name, email, message, status string
	var createdAt, updatedAt time.Time

	err := h.db.QueryRow(`
		SELECT id, name, email, message, status, created_at, updated_at
		FROM feedback WHERE id = ?
	`, id).Scan(&feedbackID, &name, &email, &message, &status, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Feedback not found",
		})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch feedback",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"id":         feedbackID,
			"name":       name,
			"email":      email,
			"message":    message,
			"status":     status,
			"created_at": createdAt,
			"updated_at": updatedAt,
		},
	})
}

// CreateFeedback - Submit new feedback (public)
func (h *FeedbackHandler) CreateFeedback(c *fiber.Ctx) error {
	var req struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Message string `json:"message"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// Validation
	if req.Name == "" || req.Message == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Name and message are required",
		})
	}

	result, err := h.db.Exec(`
		INSERT INTO feedback (name, email, message, status, updated_at)
		VALUES (?, ?, ?, 'pending', ?)
	`, req.Name, req.Email, req.Message, time.Now())

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to submit feedback",
		})
	}

	id, _ := result.LastInsertId()

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Feedback submitted successfully",
		"data": fiber.Map{
			"id": id,
		},
	})
}

// UpdateFeedbackStatus - Update feedback status (admin only)
func (h *FeedbackHandler) UpdateFeedbackStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Status string `json:"status"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// Validate status
	validStatuses := map[string]bool{
		"pending":   true,
		"reviewed":  true,
		"resolved":  true,
		"dismissed": true,
	}

	if !validStatuses[req.Status] {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid status",
		})
	}

	result, err := h.db.Exec(`
		UPDATE feedback 
		SET status = ?, updated_at = ?
		WHERE id = ?
	`, req.Status, time.Now(), id)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update feedback",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Feedback not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Feedback status updated successfully",
	})
}

// DeleteFeedback - Delete feedback (admin only)
func (h *FeedbackHandler) DeleteFeedback(c *fiber.Ctx) error {
	id := c.Params("id")

	result, err := h.db.Exec("DELETE FROM feedback WHERE id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to delete feedback",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Feedback not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Feedback deleted successfully",
	})
}

// GetFeedbackStats - Get feedback statistics
func (h *FeedbackHandler) GetFeedbackStats(c *fiber.Ctx) error {
	stats := make(map[string]interface{})

	// Total feedback
	var total int
	h.db.QueryRow("SELECT COUNT(*) FROM feedback").Scan(&total)

	// By status
	rows, err := h.db.Query(`
		SELECT status, COUNT(*) as count
		FROM feedback
		GROUP BY status
	`)
	if err == nil {
		defer rows.Close()
		byStatus := make(map[string]int)
		for rows.Next() {
			var status string
			var count int
			rows.Scan(&status, &count)
			byStatus[status] = count
		}
		stats["by_status"] = byStatus
	}

	stats["total"] = total

	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}
