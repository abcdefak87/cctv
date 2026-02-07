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
	
	// API routes
	api := app.Group("/api")
	
	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	
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
	areas.Get("/", areaHandler.GetAllAreas) // Public
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
	stream.Get("/:streamKey", streamHandler.GetStreamURL) // Public
	stream.Get("/hls/:streamKey/*", streamHandler.ProxyHLS) // Public - HLS proxy
	stream.Get("/:streamKey/stats", streamHandler.GetStreamStats) // Public
	stream.Post("/:streamKey/start", streamHandler.StartViewing) // Public
	stream.Post("/:streamKey/stop", streamHandler.StopViewing) // Public
	
	// Admin routes (admin only)
	admin := api.Group("/admin", authMiddleware)
	admin.Get("/dashboard", adminHandler.GetDashboardStats)
	admin.Get("/system", adminHandler.GetSystemInfo)
	admin.Get("/activity", adminHandler.GetRecentActivity)
	admin.Get("/camera-health", adminHandler.GetCameraHealth)
	admin.Post("/cleanup-sessions", adminHandler.CleanupSessions)
	admin.Get("/database-stats", adminHandler.GetDatabaseStats)
	
	// Feedback routes
	feedback := api.Group("/feedback")
	feedback.Post("/", feedbackHandler.CreateFeedback) // Public
	feedback.Get("/", authMiddleware, feedbackHandler.GetAllFeedback) // Admin
	feedback.Get("/stats", authMiddleware, feedbackHandler.GetFeedbackStats) // Admin
	feedback.Get("/:id", authMiddleware, feedbackHandler.GetFeedback) // Admin
	feedback.Patch("/:id/status", authMiddleware, feedbackHandler.UpdateFeedbackStatus) // Admin
	feedback.Delete("/:id", authMiddleware, feedbackHandler.DeleteFeedback) // Admin
}
