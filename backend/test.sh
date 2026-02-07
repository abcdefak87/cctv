#!/bin/bash
# Test runner script for Golang backend

set -e

echo "🧪 Running Golang Backend Tests"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run tests
echo ""
echo "📦 Running unit tests..."
if go test -v ./...; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Tests failed!${NC}"
    exit 1
fi

# Run tests with coverage
echo ""
echo "📊 Running tests with coverage..."
go test -cover ./... | tee coverage.txt

# Generate coverage report
echo ""
echo "📈 Generating coverage report..."
go test -coverprofile=coverage.out ./... > /dev/null 2>&1

if [ -f coverage.out ]; then
    COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}')
    echo -e "${GREEN}Total Coverage: $COVERAGE${NC}"
    
    # Generate HTML report
    go tool cover -html=coverage.out -o coverage.html
    echo -e "${GREEN}✅ HTML coverage report generated: coverage.html${NC}"
fi

# Run race detector
echo ""
echo "🏁 Running race detector..."
if go test -race ./... > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No race conditions detected${NC}"
else
    echo -e "${YELLOW}⚠️  Race conditions detected${NC}"
fi

# Summary
echo ""
echo "================================"
echo -e "${GREEN}✅ Test suite completed!${NC}"
echo ""
echo "📊 Test Summary:"
echo "  - Unit tests: PASSED"
echo "  - Coverage: $COVERAGE"
echo "  - Race detector: CHECKED"
echo ""
echo "📁 Generated files:"
echo "  - coverage.out"
echo "  - coverage.html"
echo "  - coverage.txt"
