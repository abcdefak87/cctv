#!/bin/bash

# go2rtc Installation Script for RAF NET CCTV
# This script downloads and sets up go2rtc to replace MediaMTX

set -e

echo "=========================================="
echo "go2rtc Installation Script"
echo "=========================================="
echo ""

# Configuration
PROJECT_DIR="/home/defak/Projects/cctv"
GO2RTC_DIR="$PROJECT_DIR/go2rtc"
GO2RTC_VERSION="latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project directory
if [ ! -f "$PROJECT_DIR/README.md" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Creating go2rtc directory${NC}"
mkdir -p "$GO2RTC_DIR"
cd "$GO2RTC_DIR"

echo -e "${GREEN}Step 2: Downloading go2rtc${NC}"
if [ -f "go2rtc" ]; then
    echo -e "${YELLOW}go2rtc binary already exists, backing up...${NC}"
    mv go2rtc go2rtc.backup.$(date +%Y%m%d_%H%M%S)
fi

wget -q --show-progress https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64 -O go2rtc
chmod +x go2rtc

echo -e "${GREEN}Step 3: Verifying installation${NC}"
if [ ! -x "go2rtc" ]; then
    echo -e "${RED}Error: go2rtc binary is not executable${NC}"
    exit 1
fi

./go2rtc --version || echo "go2rtc installed successfully"

echo -e "${GREEN}Step 4: Checking configuration${NC}"
if [ ! -f "go2rtc.yaml" ]; then
    echo -e "${YELLOW}Warning: go2rtc.yaml not found${NC}"
    echo "Please ensure go2rtc.yaml exists in $GO2RTC_DIR"
else
    echo -e "${GREEN}Configuration file found${NC}"
fi

echo -e "${GREEN}Step 5: Updating backend environment${NC}"
BACKEND_ENV="$PROJECT_DIR/backend/.env"
if [ -f "$BACKEND_ENV" ]; then
    # Backup .env
    cp "$BACKEND_ENV" "$BACKEND_ENV.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update environment variables
    sed -i 's/MEDIAMTX_API_URL/GO2RTC_API_URL/g' "$BACKEND_ENV"
    sed -i 's/MEDIAMTX_HLS_URL_INTERNAL/GO2RTC_HLS_URL_INTERNAL/g' "$BACKEND_ENV"
    sed -i 's/localhost:9997/localhost:1984/g' "$BACKEND_ENV"
    
    echo -e "${GREEN}Backend .env updated${NC}"
else
    echo -e "${YELLOW}Warning: backend/.env not found${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Installation Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Stop MediaMTX:"
echo "   pm2 stop cctv-mediamtx"
echo ""
echo "2. Start go2rtc:"
echo "   cd $GO2RTC_DIR"
echo "   pm2 start ./go2rtc --name cctv-go2rtc -- -config go2rtc.yaml"
echo "   pm2 save"
echo ""
echo "3. Rebuild and restart backend:"
echo "   cd $PROJECT_DIR/backend"
echo "   go build -o bin/server cmd/server/main.go"
echo "   pm2 restart cctv-backend"
echo ""
echo "4. Test the installation:"
echo "   curl http://localhost:1984/api"
echo ""
echo "See MIGRATION_GO2RTC.md for detailed migration guide"
echo ""
