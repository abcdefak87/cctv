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
}
