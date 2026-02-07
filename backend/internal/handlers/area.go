package handlers

import (
	"database/sql"
	"time"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/gofiber/fiber/v2"
)

type AreaHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewAreaHandler(db *sql.DB, cfg *config.Config) *AreaHandler {
	return &AreaHandler{db: db, cfg: cfg}
}

// GetAllAreas - Get all areas
func (h *AreaHandler) GetAllAreas(c *fiber.Ctx) error {
	rows, err := h.db.Query(`
		SELECT id, name, description, created_at, updated_at
		FROM areas
		ORDER BY name ASC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch areas",
		})
	}
	defer rows.Close()

	areas := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var name, description string
		var createdAt, updatedAt time.Time

		err := rows.Scan(&id, &name, &description, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		areas = append(areas, map[string]interface{}{
			"id":          id,
			"name":        name,
			"description": description,
			"created_at":  createdAt,
			"updated_at":  updatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    areas,
	})
}

// GetArea - Get single area by ID
func (h *AreaHandler) GetArea(c *fiber.Ctx) error {
	id := c.Params("id")

	var areaID int
	var name, description string
	var createdAt, updatedAt time.Time

	err := h.db.QueryRow(`
		SELECT id, name, description, created_at, updated_at
		FROM areas WHERE id = ?
	`, id).Scan(&areaID, &name, &description, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Area not found",
		})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch area",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"id":          areaID,
			"name":        name,
			"description": description,
			"created_at":  createdAt,
			"updated_at":  updatedAt,
		},
	})
}

// CreateArea - Create new area
func (h *AreaHandler) CreateArea(c *fiber.Ctx) error {
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Area name is required",
		})
	}

	result, err := h.db.Exec(`
		INSERT INTO areas (name, description, updated_at)
		VALUES (?, ?, ?)
	`, req.Name, req.Description, time.Now())

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create area",
		})
	}

	id, _ := result.LastInsertId()

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Area created successfully",
		"data": fiber.Map{
			"id": id,
		},
	})
}

// UpdateArea - Update existing area
func (h *AreaHandler) UpdateArea(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	result, err := h.db.Exec(`
		UPDATE areas 
		SET name = ?, description = ?, updated_at = ?
		WHERE id = ?
	`, req.Name, req.Description, time.Now(), id)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update area",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Area not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Area updated successfully",
	})
}

// DeleteArea - Delete area
func (h *AreaHandler) DeleteArea(c *fiber.Ctx) error {
	id := c.Params("id")

	// Check if area has cameras
	var count int
	err := h.db.QueryRow("SELECT COUNT(*) FROM cameras WHERE area_id = ?", id).Scan(&count)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to check area usage",
		})
	}

	if count > 0 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Cannot delete area with associated cameras",
		})
	}

	result, err := h.db.Exec("DELETE FROM areas WHERE id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to delete area",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Area not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Area deleted successfully",
	})
}
