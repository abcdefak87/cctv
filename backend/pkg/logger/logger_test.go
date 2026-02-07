package logger

import (
	"bytes"
	"log"
	"os"
	"strings"
	"testing"
)

func TestLoggerInit(t *testing.T) {
	t.Run("Initialize logger", func(t *testing.T) {
		Init("development")

		if infoLogger == nil {
			t.Error("infoLogger should be initialized")
		}

		if errorLogger == nil {
			t.Error("errorLogger should be initialized")
		}
	})

	t.Run("Initialize logger for production", func(t *testing.T) {
		Init("production")

		if infoLogger == nil {
			t.Error("infoLogger should be initialized")
		}

		if errorLogger == nil {
			t.Error("errorLogger should be initialized")
		}
	})
}

func TestInfo(t *testing.T) {
	t.Run("Log info message", func(t *testing.T) {
		// Capture stdout
		var buf bytes.Buffer
		infoLogger = log.New(&buf, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile)

		Info("Test info message")

		output := buf.String()
		if !strings.Contains(output, "Test info message") {
			t.Errorf("Expected log to contain 'Test info message', got: %s", output)
		}

		if !strings.Contains(output, "INFO:") {
			t.Errorf("Expected log to contain 'INFO:', got: %s", output)
		}
	})

	t.Run("Log multiple info messages", func(t *testing.T) {
		var buf bytes.Buffer
		infoLogger = log.New(&buf, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile)

		Info("Message 1", "Message 2", "Message 3")

		output := buf.String()
		if !strings.Contains(output, "Message 1") {
			t.Error("Expected log to contain 'Message 1'")
		}
		if !strings.Contains(output, "Message 2") {
			t.Error("Expected log to contain 'Message 2'")
		}
		if !strings.Contains(output, "Message 3") {
			t.Error("Expected log to contain 'Message 3'")
		}
	})
}

func TestError(t *testing.T) {
	t.Run("Log error message", func(t *testing.T) {
		// Capture stderr
		var buf bytes.Buffer
		errorLogger = log.New(&buf, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)

		Error("Test error message")

		output := buf.String()
		if !strings.Contains(output, "Test error message") {
			t.Errorf("Expected log to contain 'Test error message', got: %s", output)
		}

		if !strings.Contains(output, "ERROR:") {
			t.Errorf("Expected log to contain 'ERROR:', got: %s", output)
		}
	})

	t.Run("Log multiple error messages", func(t *testing.T) {
		var buf bytes.Buffer
		errorLogger = log.New(&buf, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)

		Error("Error 1", "Error 2")

		output := buf.String()
		if !strings.Contains(output, "Error 1") {
			t.Error("Expected log to contain 'Error 1'")
		}
		if !strings.Contains(output, "Error 2") {
			t.Error("Expected log to contain 'Error 2'")
		}
	})
}

func TestLoggerOutput(t *testing.T) {
	t.Run("Info logger writes to stdout", func(t *testing.T) {
		Init("test")

		// Verify infoLogger is configured
		if infoLogger == nil {
			t.Fatal("infoLogger should not be nil")
		}

		// Check that it's writing to stdout
		if infoLogger.Writer() != os.Stdout {
			t.Error("infoLogger should write to stdout")
		}
	})

	t.Run("Error logger writes to stderr", func(t *testing.T) {
		Init("test")

		// Verify errorLogger is configured
		if errorLogger == nil {
			t.Fatal("errorLogger should not be nil")
		}

		// Check that it's writing to stderr
		if errorLogger.Writer() != os.Stderr {
			t.Error("errorLogger should write to stderr")
		}
	})
}

func TestLoggerFlags(t *testing.T) {
	t.Run("Logger has correct flags", func(t *testing.T) {
		Init("test")

		expectedFlags := log.Ldate | log.Ltime | log.Lshortfile

		if infoLogger.Flags() != expectedFlags {
			t.Errorf("infoLogger flags mismatch. Expected %d, got %d", expectedFlags, infoLogger.Flags())
		}

		if errorLogger.Flags() != expectedFlags {
			t.Errorf("errorLogger flags mismatch. Expected %d, got %d", expectedFlags, errorLogger.Flags())
		}
	})
}

func TestLoggerPrefix(t *testing.T) {
	t.Run("Info logger has correct prefix", func(t *testing.T) {
		Init("test")

		if infoLogger.Prefix() != "INFO: " {
			t.Errorf("Expected prefix 'INFO: ', got '%s'", infoLogger.Prefix())
		}
	})

	t.Run("Error logger has correct prefix", func(t *testing.T) {
		Init("test")

		if errorLogger.Prefix() != "ERROR: " {
			t.Errorf("Expected prefix 'ERROR: ', got '%s'", errorLogger.Prefix())
		}
	})
}
