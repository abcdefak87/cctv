package handlers

import (
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/abcdefak87/cctv/internal/models"
	"github.com/gofiber/fiber/v2"
)

type CameraHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewCameraHandler(db *sql.DB, cfg *config.Config) *CameraHandler {
	return &CameraHandler{db: db, cfg: cfg}
}

// GetAllCameras - Get all cameras (admin only)
func (h *CameraHandler) GetAllCameras(c *fiber.Ctx) error {
	rows, err := h.db.Query(`
		SELECT c.id, c.name, c.private_rtsp_url, c.description, c.location, 
		       c.group_name, c.area_id, c.enabled, c.stream_key, 
		       c.created_at, c.updated_at, a.name as area_name
		FROM cameras c
		LEFT JOIN areas a ON c.area_id = a.id
		ORDER BY c.id ASC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch cameras",
		})
	}
	defer rows.Close()

	cameras := []map[string]interface{}{}
	for rows.Next() {
		var camera models.Camera
		var areaName sql.NullString
		
		err := rows.Scan(
			&camera.ID, &camera.Name, &camera.PrivateRTSPURL, &camera.Description,
			&camera.Location, &camera.GroupName, &camera.AreaID, &camera.Enabled,
			&camera.StreamKey, &camera.CreatedAt, &camera.UpdatedAt, &areaName,
		)
		if err != nil {
			continue
		}

		cameraMap := map[string]interface{}{
			"id":               camera.ID,
			"name":             camera.Name,
			"private_rtsp_url": camera.PrivateRTSPURL,
			"description":      camera.Description,
			"location":         camera.Location,
			"group_name":       camera.GroupName,
			"area_id":          camera.AreaID,
			"enabled":          camera.Enabled,
			"stream_key":       camera.StreamKey,
			"created_at":       camera.CreatedAt,
			"updated_at":       camera.UpdatedAt,
		}

		if areaName.Valid {
			cameraMap["area_name"] = areaName.String
		}

		cameras = append(cameras, cameraMap)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    cameras,
	})
}

// GetActiveCameras - Get only enabled cameras (public)
func (h *CameraHandler) GetActiveCameras(c *fiber.Ctx) error {
	rows, err := h.db.Query(`
		SELECT c.id, c.name, c.description, c.location, c.group_name, 
		       c.area_id, c.stream_key, a.name as area_name
		FROM cameras c
		LEFT JOIN areas a ON c.area_id = a.id
		WHERE c.enabled = 1
		ORDER BY c.id ASC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch cameras",
		})
	}
	defer rows.Close()

	cameras := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var name, description, location, groupName, streamKey string
		var areaID sql.NullInt64
		var areaName sql.NullString

		err := rows.Scan(&id, &name, &description, &location, &groupName, 
			&areaID, &streamKey, &areaName)
		if err != nil {
			continue
		}

		cameraMap := map[string]interface{}{
			"id":          id,
			"name":        name,
			"description": description,
			"location":    location,
			"group_name":  groupName,
			"stream_key":  streamKey,
		}

		if areaID.Valid {
			cameraMap["area_id"] = areaID.Int64
		}
		if areaName.Valid {
			cameraMap["area_name"] = areaName.String
		}

		cameras = append(cameras, cameraMap)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    cameras,
	})
}

// GetCamera - Get single camera by ID
func (h *CameraHandler) GetCamera(c *fiber.Ctx) error {
	id := c.Params("id")

	var camera models.Camera
	var areaName sql.NullString

	err := h.db.QueryRow(`
		SELECT c.id, c.name, c.private_rtsp_url, c.description, c.location,
		       c.group_name, c.area_id, c.enabled, c.stream_key,
		       c.created_at, c.updated_at, a.name as area_name
		FROM cameras c
		LEFT JOIN areas a ON c.area_id = a.id
		WHERE c.id = ?
	`, id).Scan(
		&camera.ID, &camera.Name, &camera.PrivateRTSPURL, &camera.Description,
		&camera.Location, &camera.GroupName, &camera.AreaID, &camera.Enabled,
		&camera.StreamKey, &camera.CreatedAt, &camera.UpdatedAt, &areaName,
	)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Camera not found",
		})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch camera",
		})
	}

	cameraMap := map[string]interface{}{
		"id":               camera.ID,
		"name":             camera.Name,
		"private_rtsp_url": camera.PrivateRTSPURL,
		"description":      camera.Description,
		"location":         camera.Location,
		"group_name":       camera.GroupName,
		"area_id":          camera.AreaID,
		"enabled":          camera.Enabled,
		"stream_key":       camera.StreamKey,
		"created_at":       camera.CreatedAt,
		"updated_at":       camera.UpdatedAt,
	}

	if areaName.Valid {
		cameraMap["area_name"] = areaName.String
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    cameraMap,
	})
}

// CreateCamera - Create new camera
func (h *CameraHandler) CreateCamera(c *fiber.Ctx) error {
	var req struct {
		Name           string `json:"name"`
		PrivateRTSPURL string `json:"private_rtsp_url"`
		Description    string `json:"description"`
		Location       string `json:"location"`
		GroupName      string `json:"group_name"`
		AreaID         any    `json:"area_id"` // Accept string, int, or null
		Enabled        any    `json:"enabled"` // Accept bool or int
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body: " + err.Error(),
		})
	}

	// Convert area_id to *int (handles string, int, or empty)
	var areaID *int
	switch v := req.AreaID.(type) {
	case float64:
		if v > 0 {
			id := int(v)
			areaID = &id
		}
	case string:
		if v != "" {
			var id int
			if _, err := fmt.Sscanf(v, "%d", &id); err == nil && id > 0 {
				areaID = &id
			}
		}
	}

	// Convert enabled to bool (handles both bool and int)
	enabled := false
	switch v := req.Enabled.(type) {
	case bool:
		enabled = v
	case float64:
		enabled = v != 0
	case int:
		enabled = v != 0
	}

	// Validation
	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Camera name is required",
		})
	}

	if req.PrivateRTSPURL == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "RTSP URL is required",
		})
	}

	// Generate stream key
	streamKey := generateStreamKey(req.Name)

	result, err := h.db.Exec(`
		INSERT INTO cameras (name, private_rtsp_url, description, location, 
		                     group_name, area_id, enabled, stream_key, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, req.Name, req.PrivateRTSPURL, req.Description, req.Location,
		req.GroupName, areaID, enabled, streamKey, time.Now())

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create camera",
		})
	}

	id, _ := result.LastInsertId()

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Camera created successfully",
		"data": fiber.Map{
			"id":         id,
			"stream_key": streamKey,
		},
	})
}

// UpdateCamera - Update existing camera
func (h *CameraHandler) UpdateCamera(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Name           string `json:"name"`
		PrivateRTSPURL string `json:"private_rtsp_url"`
		Description    string `json:"description"`
		Location       string `json:"location"`
		GroupName      string `json:"group_name"`
		AreaID         any    `json:"area_id"` // Accept string, int, or null
		Enabled        any    `json:"enabled"` // Accept bool or int
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body: " + err.Error(),
		})
	}

	// Convert area_id to *int
	var areaID *int
	switch v := req.AreaID.(type) {
	case float64:
		if v > 0 {
			id := int(v)
			areaID = &id
		}
	case string:
		if v != "" {
			var id int
			if _, err := fmt.Sscanf(v, "%d", &id); err == nil && id > 0 {
				areaID = &id
			}
		}
	}

	// Convert enabled to bool
	enabled := false
	switch v := req.Enabled.(type) {
	case bool:
		enabled = v
	case float64:
		enabled = v != 0
	case int:
		enabled = v != 0
	}

	result, err := h.db.Exec(`
		UPDATE cameras 
		SET name = ?, private_rtsp_url = ?, description = ?, location = ?,
		    group_name = ?, area_id = ?, enabled = ?, updated_at = ?
		WHERE id = ?
	`, req.Name, req.PrivateRTSPURL, req.Description, req.Location,
		req.GroupName, areaID, enabled, time.Now(), id)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update camera",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Camera not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Camera updated successfully",
	})
}

// DeleteCamera - Delete camera
func (h *CameraHandler) DeleteCamera(c *fiber.Ctx) error {
	id := c.Params("id")

	result, err := h.db.Exec("DELETE FROM cameras WHERE id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to delete camera",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Camera not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Camera deleted successfully",
	})
}

// ToggleCamera - Toggle camera enabled status
func (h *CameraHandler) ToggleCamera(c *fiber.Ctx) error {
	id := c.Params("id")

	// Get current status
	var enabled bool
	err := h.db.QueryRow("SELECT enabled FROM cameras WHERE id = ?", id).Scan(&enabled)
	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Camera not found",
		})
	}

	// Toggle status
	newStatus := !enabled
	_, err = h.db.Exec("UPDATE cameras SET enabled = ?, updated_at = ? WHERE id = ?",
		newStatus, time.Now(), id)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to toggle camera",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Camera status updated",
		"data": fiber.Map{
			"enabled": newStatus,
		},
	})
}

// Helper function to generate stream key
func generateStreamKey(name string) string {
	// Simple implementation - in production use UUID or more sophisticated method
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	return name + "-" + timestamp
}
