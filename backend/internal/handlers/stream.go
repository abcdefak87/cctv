package handlers

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/gofiber/fiber/v2"
)

type StreamHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewStreamHandler(db *sql.DB, cfg *config.Config) *StreamHandler {
	return &StreamHandler{db: db, cfg: cfg}
}

// GetStreamURL - Get stream URL for a camera
func (h *StreamHandler) GetStreamURL(c *fiber.Ctx) error {
	streamKey := c.Params("streamKey")

	var cameraID int
	var name string
	var enabled bool

	err := h.db.QueryRow(`
		SELECT id, name, enabled
		FROM cameras
		WHERE stream_key = ?
	`, streamKey).Scan(&cameraID, &name, &enabled)

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

	if !enabled {
		return c.Status(403).JSON(fiber.Map{
			"success": false,
			"message": "Camera is disabled",
		})
	}

	// Build stream URLs - prioritize MSE (works without HLS module)
	baseURL := h.cfg.Go2RTC.PublicStreamBaseURL
	if baseURL == "" {
		baseURL = c.BaseURL()
	}
	
	// Use MSE as HLS URL (frontend expects hls_url field)
	// MSE works with native HTML5 video, no HLS.js needed
	hlsURL := fmt.Sprintf("%s/api/stream/mse/%s", baseURL, streamKey)
	webrtcURL := fmt.Sprintf("%s/api/stream/webrtc/%s", baseURL, streamKey)

	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"camera_id":  cameraID,
			"name":       name,
			"stream_key": streamKey,
			"hls_url":    hlsURL,  // Actually MSE, but frontend expects this field
			"webrtc_url": webrtcURL,
		},
	})
}

// ProxyHLS - Proxy HLS stream from go2rtc
func (h *StreamHandler) ProxyHLS(c *fiber.Ctx) error {
	streamKey := c.Params("streamKey")
	file := c.Params("*")

	// Verify camera exists and is enabled
	var enabled bool
	err := h.db.QueryRow(`
		SELECT enabled FROM cameras WHERE stream_key = ?
	`, streamKey).Scan(&enabled)

	if err == sql.ErrNoRows {
		return c.Status(404).SendString("Camera not found")
	}

	if !enabled {
		return c.Status(403).SendString("Camera is disabled")
	}

	// Proxy request to go2rtc API
	var go2rtcURL string
	if file == "index.m3u8" {
		// Master playlist
		go2rtcURL = fmt.Sprintf("http://localhost:1984/api/stream.m3u8?src=%s", streamKey)
	} else {
		// Sub-playlists and segments - go2rtc uses /api/hls/... format
		go2rtcURL = fmt.Sprintf("http://localhost:1984/api/%s", file)
	}

	resp, err := http.Get(go2rtcURL)
	if err != nil {
		return c.Status(502).SendString("Failed to connect to stream server")
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(502).SendString("Failed to read stream")
	}

	// For master playlist, rewrite relative URLs to absolute
	if file == "index.m3u8" {
		content := string(body)
		// Replace relative path with absolute URL
		baseURL := h.cfg.Go2RTC.PublicStreamBaseURL
		if baseURL == "" {
			baseURL = c.BaseURL()
		}
		content = strings.ReplaceAll(content, "hls/playlist.m3u8", 
			fmt.Sprintf("%s/api/stream/hls/%s/hls/playlist.m3u8", baseURL, streamKey))
		body = []byte(content)
	}

	// Set appropriate headers
	c.Set("Content-Type", resp.Header.Get("Content-Type"))
	c.Set("Cache-Control", "no-cache")
	c.Status(resp.StatusCode)

	return c.Send(body)
}

// ProxyMSE - Proxy MSE/MP4 stream from go2rtc
func (h *StreamHandler) ProxyMSE(c *fiber.Ctx) error {
	streamKey := c.Params("streamKey")

	// Verify camera exists and is enabled
	var enabled bool
	err := h.db.QueryRow(`
		SELECT enabled FROM cameras WHERE stream_key = ?
	`, streamKey).Scan(&enabled)

	if err == sql.ErrNoRows {
		return c.Status(404).SendString("Camera not found")
	}

	if !enabled {
		return c.Status(403).SendString("Camera is disabled")
	}

	// Proxy to go2rtc MSE endpoint
	go2rtcURL := fmt.Sprintf("http://localhost:1984/api/stream.mp4?src=%s", streamKey)

	resp, err := http.Get(go2rtcURL)
	if err != nil {
		return c.Status(502).SendString("Failed to connect to stream server")
	}
	defer resp.Body.Close()

	// Set headers for MSE streaming
	c.Set("Content-Type", "video/mp4")
	c.Set("Cache-Control", "no-cache")
	c.Status(resp.StatusCode)

	// Stream the response
	_, err = io.Copy(c.Response().BodyWriter(), resp.Body)
	if err != nil {
		return err
	}

	return nil
}

// GetStreamStats - Get stream statistics
func (h *StreamHandler) GetStreamStats(c *fiber.Ctx) error {
	streamKey := c.Params("streamKey")

	// Verify camera exists
	var cameraID int
	var name string
	err := h.db.QueryRow(`
		SELECT id, name FROM cameras WHERE stream_key = ?
	`, streamKey).Scan(&cameraID, &name)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Camera not found",
		})
	}

	// Get viewer count from database (if tracked)
	var viewerCount int
	err = h.db.QueryRow(`
		SELECT COUNT(DISTINCT session_id) 
		FROM viewer_sessions 
		WHERE camera_id = ? AND ended_at IS NULL
	`, cameraID).Scan(&viewerCount)

	if err != nil {
		viewerCount = 0
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": map[string]interface{}{
			"camera_id":    cameraID,
			"name":         name,
			"stream_key":   streamKey,
			"viewer_count": viewerCount,
			"status":       "online",
		},
	})
}

// StartViewing - Track viewer session start
func (h *StreamHandler) StartViewing(c *fiber.Ctx) error {
	streamKey := c.Params("streamKey")

	var cameraID int
	err := h.db.QueryRow(`
		SELECT id FROM cameras WHERE stream_key = ?
	`, streamKey).Scan(&cameraID)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Camera not found",
		})
	}

	// Get or create session ID
	sessionID := c.Get("X-Session-ID")
	if sessionID == "" {
		sessionID = c.IP() + "-" + c.Get("User-Agent")
	}

	// Insert or update viewer session
	_, err = h.db.Exec(`
		INSERT INTO viewer_sessions (camera_id, session_id, ip_address, user_agent, started_at)
		VALUES (?, ?, ?, ?, datetime('now'))
		ON CONFLICT(camera_id, session_id) DO UPDATE SET started_at = datetime('now'), ended_at = NULL
	`, cameraID, sessionID, c.IP(), c.Get("User-Agent"))

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to track viewing session",
		})
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"session_id": sessionID,
	})
}

// StopViewing - Track viewer session end
func (h *StreamHandler) StopViewing(c *fiber.Ctx) error {
	streamKey := c.Params("streamKey")
	sessionID := c.Get("X-Session-ID")

	if sessionID == "" {
		sessionID = c.IP() + "-" + c.Get("User-Agent")
	}

	var cameraID int
	err := h.db.QueryRow(`
		SELECT id FROM cameras WHERE stream_key = ?
	`, streamKey).Scan(&cameraID)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Camera not found",
		})
	}

	// Update viewer session end time
	_, err = h.db.Exec(`
		UPDATE viewer_sessions 
		SET ended_at = datetime('now')
		WHERE camera_id = ? AND session_id = ? AND ended_at IS NULL
	`, cameraID, sessionID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update viewing session",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Viewing session ended",
	})
}

// GetAllStreams - Get all active streams
func (h *StreamHandler) GetAllStreams(c *fiber.Ctx) error {
	// Get all enabled cameras
	rows, err := h.db.Query(`
		SELECT id, name, stream_key, enabled
		FROM cameras
		WHERE enabled = 1
		ORDER BY id ASC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch streams",
		})
	}
	defer rows.Close()

	streams := []map[string]interface{}{}
	baseURL := h.cfg.Go2RTC.PublicStreamBaseURL
	if baseURL == "" {
		baseURL = c.BaseURL()
	}

	for rows.Next() {
		var id int
		var name, streamKey string
		var enabled bool

		err := rows.Scan(&id, &name, &streamKey, &enabled)
		if err != nil {
			continue
		}

		streams = append(streams, map[string]interface{}{
			"id":         id,
			"name":       name,
			"stream_key": streamKey,
			"streams": map[string]interface{}{
				"hls":    baseURL + "/api/stream/hls/" + streamKey + "/index.m3u8",
				"webrtc": baseURL + "/api/stream/webrtc/" + streamKey,
			},
			"status": "online",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    streams,
	})
}
