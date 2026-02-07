#!/bin/bash
# Migration automation script

set -e

echo "🚀 Starting Node.js to Golang Migration"
echo "========================================"

# Step 1: Analyze backend
echo ""
echo "📊 Step 1: Analyzing Node.js backend..."
python3 analyze_backend.py

if [ ! -f "analysis_result.json" ]; then
    echo "❌ Analysis failed!"
    exit 1
fi

echo "✅ Analysis complete!"

# Step 2: Generate Golang code
echo ""
echo "🏗️  Step 2: Generating Golang code..."

# Get module name from user or use default
if [ -z "$1" ]; then
    MODULE_NAME="github.com/yourusername/cctv-backend"
    echo "Using default module name: $MODULE_NAME"
    echo "Tip: You can specify custom module: ./migrate.sh github.com/yourname/project"
else
    MODULE_NAME="$1"
    echo "Using module name: $MODULE_NAME"
fi

python3 generate_golang.py "$MODULE_NAME"

if [ ! -d "../backend-go" ]; then
    echo "❌ Code generation failed!"
    exit 1
fi

echo "✅ Code generation complete!"

# Step 3: Setup Golang project
echo ""
echo "⚙️  Step 3: Setting up Golang project..."
cd ../backend-go

# Initialize go modules
echo "  - Initializing Go modules..."
go mod tidy

# Copy .env file
if [ -f "../backend/.env" ]; then
    echo "  - Copying .env file..."
    cp ../backend/.env .env
else
    echo "  ⚠️  No .env file found in backend/"
    echo "  - Creating .env from example..."
    if [ -f "../backend/.env.example" ]; then
        cp ../backend/.env.example .env
    fi
fi

echo "✅ Setup complete!"

# Step 4: Test build
echo ""
echo "🔨 Step 4: Testing build..."
if go build -o bin/server ./cmd/server; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Summary
echo ""
echo "========================================"
echo "✅ Migration Complete!"
echo "========================================"
echo ""
echo "📁 Generated files in: backend-go/"
echo ""
echo "🚀 Next steps:"
echo "  1. cd backend-go"
echo "  2. Review and update .env file"
echo "  3. go run cmd/server/main.go"
echo ""
echo "Or using Docker:"
echo "  1. cd backend-go"
echo "  2. make docker-build"
echo "  3. make docker-run"
echo ""
echo "📝 Manual tasks remaining:"
echo "  - Implement remaining controllers"
echo "  - Add business logic services"
echo "  - Setup MediaMTX integration"
echo "  - Add rate limiting middleware"
echo "  - Implement CSRF protection"
echo "  - Add comprehensive tests"
echo ""
echo "Happy coding! 🎉"
