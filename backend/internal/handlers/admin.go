package handlers

import (
	"database/sql"
	"time"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/gofiber/fiber/v2"
)

type AdminHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewAdminHandler(db *sql.DB, cfg *config.Config) *AdminHandler {
	return &AdminHandler{db: db, cfg: cfg}
}

// GetDashboardStats - Get dashboard statistics
func (h *AdminHandler) GetDashboardStats(c *fiber.Ctx) error {
	stats := make(map[string]interface{})

	// Total cameras
	var totalCameras, activeCameras int
	h.db.QueryRow("SELECT COUNT(*) FROM cameras").Scan(&totalCameras)
	h.db.QueryRow("SELECT COUNT(*) FROM cameras WHERE enabled = 1").Scan(&activeCameras)

	// Total users
	var totalUsers int
	h.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&totalUsers)

	// Total areas
	var totalAreas int
	h.db.QueryRow("SELECT COUNT(*) FROM areas").Scan(&totalAreas)

	// Active viewers (last 5 minutes)
	var activeViewers int
	h.db.QueryRow(`
		SELECT COUNT(DISTINCT session_id) 
		FROM viewer_sessions 
		WHERE started_at > datetime('now', '-5 minutes') AND ended_at IS NULL
	`).Scan(&activeViewers)

	// Total views today
	var viewsToday int
	h.db.QueryRow(`
		SELECT COUNT(*) 
		FROM viewer_sessions 
		WHERE DATE(started_at) = DATE('now')
	`).Scan(&viewsToday)

	// Total recordings
	var totalRecordings int
	var totalRecordingSize int64
	h.db.QueryRow("SELECT COUNT(*), COALESCE(SUM(file_size), 0) FROM recordings").Scan(&totalRecordings, &totalRecordingSize)

	stats["cameras"] = map[string]interface{}{
		"total":  totalCameras,
		"active": activeCameras,
	}
	stats["users"] = totalUsers
	stats["areas"] = totalAreas
	stats["viewers"] = map[string]interface{}{
		"active": activeViewers,
		"today":  viewsToday,
	}
	stats["recordings"] = map[string]interface{}{
		"count": totalRecordings,
		"size":  totalRecordingSize,
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}

// GetSystemInfo - Get system information
func (h *AdminHandler) GetSystemInfo(c *fiber.Ctx) error {
	info := map[string]interface{}{
		"version":    "1.0.0",
		"go_version": "1.21",
		"database":   "SQLite",
		"uptime":     time.Since(time.Now()).String(), // TODO: Track actual uptime
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    info,
	})
}

// GetRecentActivity - Get recent activity logs
func (h *AdminHandler) GetRecentActivity(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)

	rows, err := h.db.Query(`
		SELECT id, user_id, action, resource, details, ip_address, created_at
		FROM activity_logs
		ORDER BY created_at DESC
		LIMIT ?
	`, limit)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch activity logs",
		})
	}
	defer rows.Close()

	activities := []map[string]interface{}{}
	for rows.Next() {
		var id, userID int
		var action, resource, details, ipAddress string
		var createdAt time.Time

		err := rows.Scan(&id, &userID, &action, &resource, &details, &ipAddress, &createdAt)
		if err != nil {
			continue
		}

		activities = append(activities, map[string]interface{}{
			"id":         id,
			"user_id":    userID,
			"action":     action,
			"resource":   resource,
			"details":    details,
			"ip_address": ipAddress,
			"created_at": createdAt,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    activities,
	})
}

// GetCameraHealth - Get camera health status
func (h *AdminHandler) GetCameraHealth(c *fiber.Ctx) error {
	rows, err := h.db.Query(`
		SELECT c.id, c.name, c.enabled, 
		       COALESCE(h.status, 'unknown') as status,
		       COALESCE(h.last_check, datetime('now', '-1 day')) as last_check
		FROM cameras c
		LEFT JOIN camera_health h ON c.id = h.camera_id
		ORDER BY c.id
	`)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch camera health",
		})
	}
	defer rows.Close()

	cameras := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var name, status string
		var enabled bool
		var lastCheck time.Time

		err := rows.Scan(&id, &name, &enabled, &status, &lastCheck)
		if err != nil {
			continue
		}

		cameras = append(cameras, map[string]interface{}{
			"id":         id,
			"name":       name,
			"enabled":    enabled,
			"status":     status,
			"last_check": lastCheck,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    cameras,
	})
}

// CleanupSessions - Cleanup old viewer sessions
func (h *AdminHandler) CleanupSessions(c *fiber.Ctx) error {
	days := c.QueryInt("days", 7)

	result, err := h.db.Exec(`
		DELETE FROM viewer_sessions 
		WHERE started_at < datetime('now', '-' || ? || ' days')
	`, days)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to cleanup sessions",
		})
	}

	rowsAffected, _ := result.RowsAffected()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Sessions cleaned up successfully",
		"deleted": rowsAffected,
	})
}

// GetDatabaseStats - Get database statistics
func (h *AdminHandler) GetDatabaseStats(c *fiber.Ctx) error {
	stats := make(map[string]interface{})

	tables := []string{"cameras", "users", "areas", "settings", "viewer_sessions", "recordings", "activity_logs"}

	for _, table := range tables {
		var count int
		h.db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&count)
		stats[table] = count
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}
