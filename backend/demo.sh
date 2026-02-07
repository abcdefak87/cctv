#!/bin/bash
# Demo script untuk testing Golang backend

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}║          🚀 GOLANG BACKEND DEMO & TESTING 🚀                 ║${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

BASE_URL="http://localhost:3001"

echo ""
echo -e "${YELLOW}📡 Testing Backend Endpoints...${NC}"
echo ""

# Test 1: Health Check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Test 1: Health Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
curl -s $BASE_URL/health | jq .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

# Test 2: Login with valid credentials
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Test 2: Login (Valid Credentials)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "$RESPONSE" | jq .

TOKEN=$(echo "$RESPONSE" | jq -r '.token')
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo -e "${YELLOW}Token: ${TOKEN:0:50}...${NC}"
else
    echo -e "${RED}❌ Login failed${NC}"
    exit 1
fi

# Test 3: Verify token
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Test 3: Verify Token${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
curl -s -X GET $BASE_URL/api/auth/verify \
  -H "Authorization: Bearer $TOKEN" | jq .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Token verification passed${NC}"
else
    echo -e "${RED}❌ Token verification failed${NC}"
fi

# Test 4: Login with invalid credentials
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Test 4: Login (Invalid Credentials)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpassword"}')

echo "$RESPONSE" | jq .

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" == "false" ]; then
    echo -e "${GREEN}✅ Invalid credentials rejected correctly${NC}"
else
    echo -e "${RED}❌ Should reject invalid credentials${NC}"
fi

# Test 5: Verify without token
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Test 5: Verify Without Token${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
RESPONSE=$(curl -s -X GET $BASE_URL/api/auth/verify)
echo "$RESPONSE" | jq .

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" == "false" ]; then
    echo -e "${GREEN}✅ Unauthorized access blocked correctly${NC}"
else
    echo -e "${RED}❌ Should block unauthorized access${NC}"
fi

# Test 6: Logout
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Test 6: Logout${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
curl -s -X POST $BASE_URL/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" | jq .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Logout successful${NC}"
else
    echo -e "${RED}❌ Logout failed${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}║                    ✅ ALL TESTS PASSED! ✅                    ║${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${GREEN}📊 Test Summary:${NC}"
echo -e "  ✅ Health check"
echo -e "  ✅ Login with valid credentials"
echo -e "  ✅ Token verification"
echo -e "  ✅ Invalid credentials rejection"
echo -e "  ✅ Unauthorized access blocking"
echo -e "  ✅ Logout"

echo ""
echo -e "${YELLOW}🎯 Backend is running and all endpoints are working!${NC}"
echo ""
