package handlers

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/gofiber/fiber/v2"
)

type SettingsHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewSettingsHandler(db *sql.DB, cfg *config.Config) *SettingsHandler {
	return &SettingsHandler{db: db, cfg: cfg}
}

// GetSettings - Get all settings
func (h *SettingsHandler) GetSettings(c *fiber.Ctx) error {
	rows, err := h.db.Query(`
		SELECT key, value, category, description, updated_at
		FROM settings
		ORDER BY category, key
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch settings",
		})
	}
	defer rows.Close()

	settings := make(map[string]interface{})
	for rows.Next() {
		var key, value, category, description string
		var updatedAt time.Time

		err := rows.Scan(&key, &value, &category, &description, &updatedAt)
		if err != nil {
			continue
		}

		// Try to parse JSON value
		var parsedValue interface{}
		if err := json.Unmarshal([]byte(value), &parsedValue); err != nil {
			parsedValue = value
		}

		if settings[category] == nil {
			settings[category] = make(map[string]interface{})
		}

		settings[category].(map[string]interface{})[key] = map[string]interface{}{
			"value":       parsedValue,
			"description": description,
			"updated_at":  updatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    settings,
	})
}

// GetSettingsByCategory - Get settings by category
func (h *SettingsHandler) GetSettingsByCategory(c *fiber.Ctx) error {
	category := c.Params("category")

	rows, err := h.db.Query(`
		SELECT key, value, description, updated_at
		FROM settings
		WHERE category = ?
		ORDER BY key
	`, category)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch settings",
		})
	}
	defer rows.Close()

	settings := make(map[string]interface{})
	for rows.Next() {
		var key, value, description string
		var updatedAt time.Time

		err := rows.Scan(&key, &value, &description, &updatedAt)
		if err != nil {
			continue
		}

		// Try to parse JSON value
		var parsedValue interface{}
		if err := json.Unmarshal([]byte(value), &parsedValue); err != nil {
			parsedValue = value
		}

		settings[key] = map[string]interface{}{
			"value":       parsedValue,
			"description": description,
			"updated_at":  updatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    settings,
	})
}

// GetSetting - Get single setting
func (h *SettingsHandler) GetSetting(c *fiber.Ctx) error {
	key := c.Params("key")

	var value, category, description string
	var updatedAt time.Time

	err := h.db.QueryRow(`
		SELECT value, category, description, updated_at
		FROM settings WHERE key = ?
	`, key).Scan(&value, &category, &description, &updatedAt)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Setting not found",
		})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch setting",
		})
	}

	// Try to parse JSON value
	var parsedValue interface{}
	if err := json.Unmarshal([]byte(value), &parsedValue); err != nil {
		parsedValue = value
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"key":         key,
			"value":       parsedValue,
			"category":    category,
			"description": description,
			"updated_at":  updatedAt,
		},
	})
}

// UpdateSetting - Update or create setting
func (h *SettingsHandler) UpdateSetting(c *fiber.Ctx) error {
	key := c.Params("key")

	var req struct {
		Value       interface{} `json:"value"`
		Category    string      `json:"category"`
		Description string      `json:"description"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// Convert value to JSON string
	valueJSON, err := json.Marshal(req.Value)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid value format",
		})
	}

	// Check if setting exists
	var exists int
	err = h.db.QueryRow("SELECT COUNT(*) FROM settings WHERE key = ?", key).Scan(&exists)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to check setting",
		})
	}

	if exists > 0 {
		// Update existing
		_, err = h.db.Exec(`
			UPDATE settings 
			SET value = ?, category = ?, description = ?, updated_at = ?
			WHERE key = ?
		`, string(valueJSON), req.Category, req.Description, time.Now(), key)
	} else {
		// Insert new
		_, err = h.db.Exec(`
			INSERT INTO settings (key, value, category, description, updated_at)
			VALUES (?, ?, ?, ?, ?)
		`, key, string(valueJSON), req.Category, req.Description, time.Now())
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update setting",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Setting updated successfully",
	})
}

// DeleteSetting - Delete setting
func (h *SettingsHandler) DeleteSetting(c *fiber.Ctx) error {
	key := c.Params("key")

	result, err := h.db.Exec("DELETE FROM settings WHERE key = ?", key)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to delete setting",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Setting not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Setting deleted successfully",
	})
}

// BulkUpdateSettings - Update multiple settings at once
func (h *SettingsHandler) BulkUpdateSettings(c *fiber.Ctx) error {
	var req map[string]interface{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	tx, err := h.db.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to start transaction",
		})
	}
	defer tx.Rollback()

	for key, value := range req {
		valueJSON, err := json.Marshal(value)
		if err != nil {
			continue
		}

		// Upsert
		_, err = tx.Exec(`
			INSERT INTO settings (key, value, updated_at)
			VALUES (?, ?, ?)
			ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
		`, key, string(valueJSON), time.Now(), string(valueJSON), time.Now())

		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"message": "Failed to update settings",
			})
		}
	}

	if err := tx.Commit(); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to commit transaction",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Settings updated successfully",
	})
}

// GetMapCenter - Get map default center (public)
func (h *SettingsHandler) GetMapCenter(c *fiber.Ctx) error {
	var value string
	err := h.db.QueryRow(`SELECT value FROM settings WHERE key = 'map_default_center'`).Scan(&value)
	
	if err != nil {
		// Return default if not found
		return c.JSON(fiber.Map{
			"success": true,
			"data": map[string]interface{}{
				"latitude":  -7.150370,
				"longitude": 112.034990,
				"zoom":      13,
				"name":      "Bojonegoro",
			},
		})
	}

	var mapCenter map[string]interface{}
	if err := json.Unmarshal([]byte(value), &mapCenter); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to parse map center",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    mapCenter,
	})
}

// GetLandingPageSettings - Get landing page settings (public)
func (h *SettingsHandler) GetLandingPageSettings(c *fiber.Ctx) error {
	// Return default landing page settings
	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"hero_badge":     "LIVE STREAMING 24 JAM",
			"section_title":  "CCTV Publik",
			"area_coverage":  "Saat ini area coverage kami baru mencakup <strong>Dander</strong> dan <strong>Tanjungharjo</strong>",
		},
	})
}

// GetPublicBranding - Get public branding settings
func (h *SettingsHandler) GetPublicBranding(c *fiber.Ctx) error {
	// Return default branding
	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"company_name":    "RAF NET",
			"company_tagline": "CCTV Monitoring System",
			"primary_color":   "#0ea5e9",
			"logo_text":       "RN",
		},
	})
}

// GetSaweriaConfig - Get Saweria configuration (public)
func (h *SettingsHandler) GetSaweriaConfig(c *fiber.Ctx) error {
	// Return empty config for now
	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"enabled": false,
			"link":    "",
		},
	})
}

// GetAdminBranding - Get admin branding settings
func (h *SettingsHandler) GetAdminBranding(c *fiber.Ctx) error {
	// Return settings in array format expected by frontend
	return c.JSON(fiber.Map{
		"success": true,
		"data": []map[string]interface{}{
			{"key": "company_name", "value": "RAF NET", "description": "Company name"},
			{"key": "company_tagline", "value": "CCTV Monitoring System", "description": "Company tagline"},
			{"key": "primary_color", "value": "#0ea5e9", "description": "Primary color"},
			{"key": "logo_text", "value": "RN", "description": "Logo text (inisial)"},
		},
	})
}

// GetTimezone - Get timezone setting
func (h *SettingsHandler) GetTimezone(c *fiber.Ctx) error {
	// Return default timezone
	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"timezone": "Asia/Jakarta",
		},
	})
}

// GetSaweriaSettings - Get Saweria settings (admin)
func (h *SettingsHandler) GetSaweriaSettings(c *fiber.Ctx) error {
	// Return empty settings for now
	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"enabled":    false,
			"stream_key": "",
			"overlay_id": "",
		},
	})
}
