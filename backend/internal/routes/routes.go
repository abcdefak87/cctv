package routes

import (
	"database/sql"

	"github.com/abcdefak87/cctv/internal/config"
	"github.com/abcdefak87/cctv/internal/handlers"
	"github.com/abcdefak87/cctv/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func Setup(app *fiber.App, db *sql.DB, cfg *config.Config) {
	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	cameraHandler := handlers.NewCameraHandler(db, cfg)
	areaHandler := handlers.NewAreaHandler(db, cfg)
	userHandler := handlers.NewUserHandler(db, cfg)
	settingsHandler := handlers.NewSettingsHandler(db, cfg)
	streamHandler := handlers.NewStreamHandler(db, cfg)
	adminHandler := handlers.NewAdminHandler(db, cfg)
	feedbackHandler := handlers.NewFeedbackHandler(db, cfg)
	recordingHandler := handlers.NewRecordingHandler(db, cfg)
	
	// API routes
	api := app.Group("/api")
	
	// Public routes (no auth required)
	api.Get("/branding/public", settingsHandler.GetPublicBranding)
	api.Get("/branding/admin", settingsHandler.GetAdminBranding)
	api.Get("/saweria/config", settingsHandler.GetSaweriaConfig)
	api.Get("/saweria/settings", settingsHandler.GetSaweriaSettings)
	
	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	auth.Get("/csrf", authHandler.GetCSRF) // CSRF token
	auth.Post("/refresh", authHandler.RefreshToken) // Refresh JWT
	
	// Protected routes
	authMiddleware := middleware.AuthMiddleware(cfg.JWT.Secret)
	auth.Get("/verify", authMiddleware, authHandler.Verify)
	
	// Camera routes
	cameras := api.Group("/cameras")
	cameras.Get("/active", cameraHandler.GetActiveCameras) // Public
	cameras.Get("/", authMiddleware, cameraHandler.GetAllCameras) // Admin
	cameras.Get("/:id", authMiddleware, cameraHandler.GetCamera)
	cameras.Post("/", authMiddleware, cameraHandler.CreateCamera)
	cameras.Put("/:id", authMiddleware, cameraHandler.UpdateCamera)
	cameras.Delete("/:id", authMiddleware, cameraHandler.DeleteCamera)
	cameras.Patch("/:id/toggle", authMiddleware, cameraHandler.ToggleCamera)
	
	// Area routes
	areas := api.Group("/areas")
	areas.Get("/", areaHandler.GetAllAreas) // Public - also accessible as /public
	areas.Get("/public", areaHandler.GetAllAreas) // Public alias
	areas.Get("/:id", authMiddleware, areaHandler.GetArea)
	areas.Post("/", authMiddleware, areaHandler.CreateArea)
	areas.Put("/:id", authMiddleware, areaHandler.UpdateArea)
	areas.Delete("/:id", authMiddleware, areaHandler.DeleteArea)
	
	// User routes (admin only)
	users := api.Group("/users", authMiddleware)
	users.Get("/", userHandler.GetAllUsers)
	users.Get("/:id", userHandler.GetUser)
	users.Post("/", userHandler.CreateUser)
	users.Put("/:id", userHandler.UpdateUser)
	users.Delete("/:id", userHandler.DeleteUser)
	users.Post("/:id/change-password", userHandler.ChangePassword)
	
	// Public settings routes (MUST be before protected settings group)
	api.Get("/settings/landing-page", settingsHandler.GetLandingPageSettings)
	api.Get("/settings/map-center", settingsHandler.GetMapCenter)
	
	// Settings routes (admin only)
	settings := api.Group("/settings", authMiddleware)
	settings.Get("/", settingsHandler.GetSettings)
	settings.Get("/category/:category", settingsHandler.GetSettingsByCategory)
	settings.Get("/:key", settingsHandler.GetSetting)
	settings.Put("/:key", settingsHandler.UpdateSetting)
	settings.Delete("/:key", settingsHandler.DeleteSetting)
	settings.Post("/bulk", settingsHandler.BulkUpdateSettings)
	
	// Stream routes
	stream := api.Group("/stream")
	stream.Get("/", streamHandler.GetAllStreams) // List all active streams
	stream.Get("/:streamKey", streamHandler.GetStreamURL) // Public
	stream.Get("/hls/:streamKey/*", streamHandler.ProxyHLS) // Public - HLS proxy
	stream.Get("/mse/:streamKey", streamHandler.ProxyMSE) // Public - MSE/MP4 proxy
	stream.Get("/:streamKey/stats", streamHandler.GetStreamStats) // Public
	stream.Post("/:streamKey/start", streamHandler.StartViewing) // Public
	stream.Post("/:streamKey/stop", streamHandler.StopViewing) // Public
	
	// Admin routes (admin only)
	admin := api.Group("/admin", authMiddleware)
	admin.Get("/dashboard", adminHandler.GetDashboardStats)
	admin.Get("/stats", adminHandler.GetDashboardStats) // Alias for dashboard stats
	admin.Get("/settings/timezone", settingsHandler.GetTimezone)
	admin.Get("/stats/today", func(c *fiber.Ctx) error {
		// Return today's stats in format expected by QuickStatsCards
		return c.JSON(fiber.Map{
			"success": true,
			"data": fiber.Map{
				"current": fiber.Map{
					"activeNow":      0,  // Active viewers now
					"totalSessions":  0,  // Total sessions today
					"uniqueViewers":  0,  // Unique viewers today
					"avgDuration":    0,  // Average duration in seconds
				},
				"comparison": fiber.Map{
					"sessionsChange": 0,  // % change from yesterday
					"viewersChange":  0,  // % change from yesterday
					"durationChange": 0,  // % change from yesterday
				},
				"cameras": fiber.Map{
					"online":  0,
					"offline": 0,
					"total":   0,
				},
			},
		})
	})
	admin.Get("/system", adminHandler.GetSystemInfo)
	admin.Get("/activity", adminHandler.GetRecentActivity)
	admin.Get("/camera-health", adminHandler.GetCameraHealth)
	admin.Post("/cleanup-sessions", adminHandler.CleanupSessions)
	admin.Get("/database-stats", adminHandler.GetDatabaseStats)
	
	// Analytics routes (placeholders - return empty data for now)
	admin.Get("/analytics/viewers", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"data": fiber.Map{
				"viewers": []interface{}{},
				"total": 0,
			},
		})
	})
	admin.Get("/analytics/realtime", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"data": fiber.Map{
				"active_viewers": 0,
				"cameras": []interface{}{},
			},
		})
	})
	
	// Telegram routes (placeholders)
	admin.Get("/telegram/status", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"data": fiber.Map{
				"enabled": false,
				"connected": false,
			},
		})
	})
	admin.Put("/telegram/config", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Telegram config updated",
		})
	})
	admin.Post("/telegram/test", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Test notification sent",
		})
	})
	
	// Feedback routes
	feedback := api.Group("/feedback")
	feedback.Post("/", feedbackHandler.CreateFeedback) // Public
	feedback.Get("/", authMiddleware, feedbackHandler.GetAllFeedback) // Admin
	feedback.Get("/stats", authMiddleware, feedbackHandler.GetFeedbackStats) // Admin
	feedback.Get("/:id", authMiddleware, feedbackHandler.GetFeedback) // Admin
	feedback.Patch("/:id/status", authMiddleware, feedbackHandler.UpdateFeedbackStatus) // Admin
	feedback.Delete("/:id", authMiddleware, feedbackHandler.DeleteFeedback) // Admin
	
	// Recording routes (admin only)
	recordings := api.Group("/recordings", authMiddleware)
	recordings.Get("/overview", recordingHandler.GetRecordingsOverview)
	recordings.Get("/restarts", recordingHandler.GetRestartLogs)
	recordings.Get("/:cameraId/restarts", recordingHandler.GetCameraRestartLogs)
	
	// Sponsor routes (placeholders for future implementation)
	sponsors := api.Group("/sponsors", authMiddleware)
	sponsors.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"data": []interface{}{},
		})
	})
	sponsors.Get("/stats", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"data": fiber.Map{
				"total": 0,
				"active": 0,
			},
		})
	})
	sponsors.Post("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Sponsor created",
		})
	})
	sponsors.Put("/:id", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Sponsor updated",
		})
	})
	sponsors.Delete("/:id", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Sponsor deleted",
		})
	})
}
