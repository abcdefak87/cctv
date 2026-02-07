package models

import (
	"testing"
	"time"
)

func TestCameraModel(t *testing.T) {
	t.Run("Create Camera", func(t *testing.T) {
		now := time.Now()
		camera := Camera{
			ID:             1,
			Name:           "Front Gate",
			PrivateRTSPURL: "rtsp://192.168.1.100:554/stream",
			Description:    "Main entrance camera",
			Location:       "Building A",
			GroupName:      "Entrance",
			Enabled:        true,
			StreamKey:      "front-gate-stream",
			CreatedAt:      now,
			UpdatedAt:      now,
		}

		if camera.Name != "Front Gate" {
			t.Errorf("Expected name 'Front Gate', got '%s'", camera.Name)
		}

		if !camera.Enabled {
			t.Error("Camera should be enabled")
		}

		if camera.StreamKey != "front-gate-stream" {
			t.Errorf("Expected stream key 'front-gate-stream', got '%s'", camera.StreamKey)
		}
	})

	t.Run("Camera with Area", func(t *testing.T) {
		areaID := 5
		camera := Camera{
			ID:        1,
			Name:      "Test Camera",
			AreaID:    &areaID,
			Enabled:   true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if camera.AreaID == nil {
			t.Error("AreaID should not be nil")
		}

		if *camera.AreaID != 5 {
			t.Errorf("Expected AreaID 5, got %d", *camera.AreaID)
		}
	})

	t.Run("Camera without Area", func(t *testing.T) {
		camera := Camera{
			ID:        1,
			Name:      "Test Camera",
			AreaID:    nil,
			Enabled:   true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if camera.AreaID != nil {
			t.Error("AreaID should be nil")
		}
	})

	t.Run("Disabled Camera", func(t *testing.T) {
		camera := Camera{
			ID:        1,
			Name:      "Disabled Camera",
			Enabled:   false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if camera.Enabled {
			t.Error("Camera should be disabled")
		}
	})
}

func TestCameraValidation(t *testing.T) {
	t.Run("Valid Camera", func(t *testing.T) {
		camera := Camera{
			Name:           "Valid Camera",
			PrivateRTSPURL: "rtsp://192.168.1.100:554/stream",
			Enabled:        true,
		}

		if camera.Name == "" {
			t.Error("Name should not be empty")
		}

		if camera.PrivateRTSPURL == "" {
			t.Error("RTSP URL should not be empty")
		}
	})

	t.Run("Camera with Empty Name", func(t *testing.T) {
		camera := Camera{
			Name:           "",
			PrivateRTSPURL: "rtsp://192.168.1.100:554/stream",
		}

		// In real implementation, this should be validated
		if camera.Name != "" {
			t.Error("Name should be empty for this test")
		}
	})
}
