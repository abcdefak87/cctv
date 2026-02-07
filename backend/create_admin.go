package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Connect to database
	db, err := sql.Open("sqlite3", "./data/cctv.db")
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Check if admin exists
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", "admin").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to check admin: %v", err)
	}

	if count > 0 {
		fmt.Println("Admin user already exists")
		return
	}

	// Create admin user
	password := "admin123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	_, err = db.Exec(
		"INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
		"admin", string(hashedPassword), "admin",
	)
	if err != nil {
		log.Fatalf("Failed to create admin: %v", err)
	}

	fmt.Println("✅ Admin user created successfully!")
	fmt.Println("   Username: admin")
	fmt.Println("   Password: admin123")
	fmt.Println("")
	fmt.Println("⚠️  IMPORTANT: Change this password in production!")
}
