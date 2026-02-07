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
	
	// API routes
	api := app.Group("/api")
	
	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	
	// Protected routes
	authMiddleware := middleware.AuthMiddleware(cfg.JWT.Secret)
	auth.Get("/verify", authMiddleware, authHandler.Verify)
	
	// TODO: Add more routes here
	// cameras := api.Group("/cameras", authMiddleware)
	// areas := api.Group("/areas", authMiddleware)
	// etc...
}
