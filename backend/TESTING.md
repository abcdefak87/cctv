# Testing Guide

Comprehensive testing guide for Golang CCTV Backend.

## 📊 Test Coverage

Current test coverage:

| Package | Coverage | Status |
|---------|----------|--------|
| internal/config | 100% | ✅ |
| internal/handlers | 92% | ✅ |
| internal/middleware | 100% | ✅ |
| internal/models | 100% | ✅ |
| pkg/logger | 100% | ✅ |

**Overall Coverage**: ~98%

## 🧪 Running Tests

### Quick Test

```bash
# Run all tests
go test ./...

# Run with verbose output
go test -v ./...

# Run specific package
go test ./internal/handlers/...
```

### Using Makefile

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Generate HTML coverage report
make test-coverage-html

# Run race detector
make test-race

# Run short tests only
make test-short
```

### Using Test Script

```bash
# Run comprehensive test suite
./test.sh
```

This will:
- Run all unit tests
- Generate coverage report
- Run race detector
- Create HTML coverage report

## 📁 Test Structure

```
backend/
├── internal/
│   ├── config/
│   │   ├── config.go
│   │   └── config_test.go          ✅ 100% coverage
│   ├── handlers/
│   │   ├── auth.go
│   │   └── auth_test.go            ✅ 92% coverage
│   ├── middleware/
│   │   ├── auth.go
│   │   └── auth_test.go            ✅ 100% coverage
│   └── models/
│       ├── user.go
│       ├── user_test.go            ✅ 100% coverage
│       ├── camera.go
│       └── camera_test.go          ✅ 100% coverage
└── pkg/
    └── logger/
        ├── logger.go
        └── logger_test.go          ✅ 100% coverage
```

## 🎯 Test Categories

### Unit Tests

Test individual functions and methods in isolation.

**Example:**
```go
func TestUserModel(t *testing.T) {
    user := User{
        Username: "testuser",
        Role:     "admin",
    }
    
    if user.Username != "testuser" {
        t.Errorf("Expected 'testuser', got '%s'", user.Username)
    }
}
```

### Integration Tests

Test interaction between components.

**Example:**
```go
func TestAuthHandler_Login(t *testing.T) {
    db := setupTestDB(t)
    defer db.Close()
    
    handler := NewAuthHandler(db, cfg)
    // Test login flow
}
```

### HTTP Handler Tests

Test HTTP endpoints using Fiber test utilities.

**Example:**
```go
func TestLoginEndpoint(t *testing.T) {
    app := fiber.New()
    app.Post("/login", handler.Login)
    
    req := httptest.NewRequest("POST", "/login", body)
    resp, _ := app.Test(req)
    
    if resp.StatusCode != 200 {
        t.Error("Expected 200")
    }
}
```

## 📝 Writing Tests

### Test File Naming

- Test files must end with `_test.go`
- Place test files in the same package as the code being tested
- Example: `auth.go` → `auth_test.go`

### Test Function Naming

```go
// Format: Test<FunctionName>
func TestLogin(t *testing.T) { }

// For methods: Test<Type>_<Method>
func TestAuthHandler_Login(t *testing.T) { }

// For subtests: Use t.Run()
func TestLogin(t *testing.T) {
    t.Run("Valid credentials", func(t *testing.T) {
        // Test code
    })
    
    t.Run("Invalid credentials", func(t *testing.T) {
        // Test code
    })
}
```

### Test Structure

```go
func TestFeature(t *testing.T) {
    // 1. Setup
    db := setupTestDB(t)
    defer db.Close()
    
    // 2. Execute
    result := functionUnderTest(input)
    
    // 3. Assert
    if result != expected {
        t.Errorf("Expected %v, got %v", expected, result)
    }
    
    // 4. Cleanup (if needed)
    cleanup()
}
```

## 🔧 Test Utilities

### Setup Test Database

```go
func setupTestDB(t *testing.T) *sql.DB {
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("Failed to open test database: %v", err)
    }
    
    // Create tables
    _, err = db.Exec(`CREATE TABLE users (...)`)
    if err != nil {
        t.Fatalf("Failed to create table: %v", err)
    }
    
    return db
}
```

### HTTP Request Testing

```go
import (
    "net/http/httptest"
    "github.com/gofiber/fiber/v2"
)

func TestHTTPHandler(t *testing.T) {
    app := fiber.New()
    app.Get("/test", handler)
    
    req := httptest.NewRequest("GET", "/test", nil)
    req.Header.Set("Authorization", "Bearer token")
    
    resp, err := app.Test(req)
    if err != nil {
        t.Fatalf("Request failed: %v", err)
    }
    
    if resp.StatusCode != 200 {
        t.Errorf("Expected 200, got %d", resp.StatusCode)
    }
}
```

### JWT Token Testing

```go
import "github.com/golang-jwt/jwt/v5"

func createTestToken(secret string) string {
    claims := jwt.MapClaims{
        "user_id":  1,
        "username": "testuser",
        "exp":      time.Now().Add(time.Hour).Unix(),
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenString, _ := token.SignedString([]byte(secret))
    
    return tokenString
}
```

## 📊 Coverage Reports

### Generate Coverage

```bash
# Terminal output
go test -cover ./...

# Detailed coverage
go test -coverprofile=coverage.out ./...

# HTML report
go tool cover -html=coverage.out -o coverage.html

# Open in browser
xdg-open coverage.html  # Linux
open coverage.html      # macOS
```

### Coverage Thresholds

- **Minimum**: 80% coverage
- **Target**: 90% coverage
- **Current**: ~98% coverage ✅

## 🏁 Race Detector

Detect race conditions in concurrent code:

```bash
# Run with race detector
go test -race ./...

# Or using Makefile
make test-race
```

## 🐛 Debugging Tests

### Verbose Output

```bash
go test -v ./...
```

### Run Specific Test

```bash
# Run specific test function
go test -v -run TestLogin ./internal/handlers/

# Run specific subtest
go test -v -run TestLogin/Valid_credentials ./internal/handlers/
```

### Print Debug Info

```go
func TestDebug(t *testing.T) {
    t.Logf("Debug info: %v", value)
    t.Log("Additional info")
}
```

### Skip Tests

```go
func TestSkip(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping in short mode")
    }
    // Test code
}
```

## 📈 Benchmarking

```go
func BenchmarkLogin(b *testing.B) {
    // Setup
    handler := NewAuthHandler(db, cfg)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        handler.Login(req)
    }
}
```

Run benchmarks:
```bash
go test -bench=. ./...
go test -bench=BenchmarkLogin ./internal/handlers/
```

## ✅ Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests.

```go
// ❌ Bad
var globalUser User

func TestA(t *testing.T) {
    globalUser = User{...}
}

func TestB(t *testing.T) {
    // Depends on TestA
    if globalUser.Username != "test" { }
}

// ✅ Good
func TestA(t *testing.T) {
    user := User{...}
    // Test with local user
}

func TestB(t *testing.T) {
    user := User{...}
    // Independent test
}
```

### 2. Use Table-Driven Tests

```go
func TestValidation(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    bool
        wantErr bool
    }{
        {"valid", "test@example.com", true, false},
        {"invalid", "notanemail", false, true},
        {"empty", "", false, true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Validate(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}
```

### 3. Clean Up Resources

```go
func TestWithDB(t *testing.T) {
    db := setupTestDB(t)
    defer db.Close()  // Always cleanup
    
    // Test code
}
```

### 4. Use Subtests

```go
func TestFeature(t *testing.T) {
    t.Run("success case", func(t *testing.T) {
        // Test success
    })
    
    t.Run("error case", func(t *testing.T) {
        // Test error
    })
}
```

### 5. Test Error Cases

```go
func TestErrorHandling(t *testing.T) {
    t.Run("handles nil input", func(t *testing.T) {
        _, err := Process(nil)
        if err == nil {
            t.Error("Expected error for nil input")
        }
    })
}
```

## 🚀 Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v2
        with:
          go-version: 1.21
      
      - name: Run tests
        run: go test -v -cover ./...
      
      - name: Race detector
        run: go test -race ./...
```

## 📚 Resources

- [Go Testing Package](https://pkg.go.dev/testing)
- [Fiber Testing](https://docs.gofiber.io/guide/testing)
- [Table Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)
- [Go Test Comments](https://github.com/golang/go/wiki/TestComments)

## 🎯 TODO

- [ ] Add integration tests for database operations
- [ ] Add E2E tests for complete workflows
- [ ] Add performance benchmarks
- [ ] Add load testing scenarios
- [ ] Add mock implementations for external services

---

**Test Coverage**: ~98%  
**Last Updated**: 2026-02-08  
**Status**: ✅ All tests passing
