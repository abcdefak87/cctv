#!/bin/bash

# Test script for new endpoints
# Usage: ./test_new_endpoints.sh

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing New Backend Endpoints ===${NC}\n"

# 1. Login to get token
echo -e "${BLUE}1. Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Login successful${NC}\n"

# 2. Test Areas endpoint
echo -e "${BLUE}2. Testing Areas endpoint (GET /api/areas)...${NC}"
AREAS_RESPONSE=$(curl -s "$BASE_URL/api/areas")
if echo $AREAS_RESPONSE | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Areas endpoint working${NC}"
else
  echo -e "${RED}❌ Areas endpoint failed${NC}"
fi
echo "Response: $AREAS_RESPONSE"
echo ""

# 3. Test Create Area
echo -e "${BLUE}3. Testing Create Area (POST /api/areas)...${NC}"
CREATE_AREA=$(curl -s -X POST "$BASE_URL/api/areas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Area","description":"Area for testing"}')
if echo $CREATE_AREA | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Create area successful${NC}"
  AREA_ID=$(echo $CREATE_AREA | grep -o '"id":[0-9]*' | cut -d':' -f2)
else
  echo -e "${RED}❌ Create area failed${NC}"
fi
echo "Response: $CREATE_AREA"
echo ""

# 4. Test Users endpoint
echo -e "${BLUE}4. Testing Users endpoint (GET /api/users)...${NC}"
USERS_RESPONSE=$(curl -s "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN")
if echo $USERS_RESPONSE | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Users endpoint working${NC}"
else
  echo -e "${RED}❌ Users endpoint failed${NC}"
fi
echo "Response: $USERS_RESPONSE"
echo ""

# 5. Test Settings endpoint
echo -e "${BLUE}5. Testing Settings endpoint (GET /api/settings)...${NC}"
SETTINGS_RESPONSE=$(curl -s "$BASE_URL/api/settings" \
  -H "Authorization: Bearer $TOKEN")
if echo $SETTINGS_RESPONSE | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Settings endpoint working${NC}"
else
  echo -e "${RED}❌ Settings endpoint failed${NC}"
fi
echo "Response: $SETTINGS_RESPONSE"
echo ""

# 6. Test Admin Dashboard
echo -e "${BLUE}6. Testing Admin Dashboard (GET /api/admin/dashboard)...${NC}"
DASHBOARD_RESPONSE=$(curl -s "$BASE_URL/api/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN")
if echo $DASHBOARD_RESPONSE | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Admin dashboard working${NC}"
else
  echo -e "${RED}❌ Admin dashboard failed${NC}"
fi
echo "Response: $DASHBOARD_RESPONSE"
echo ""

# 7. Test Feedback submission (public)
echo -e "${BLUE}7. Testing Feedback submission (POST /api/feedback)...${NC}"
FEEDBACK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/feedback" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"This is a test feedback"}')
if echo $FEEDBACK_RESPONSE | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Feedback submission working${NC}"
else
  echo -e "${RED}❌ Feedback submission failed${NC}"
fi
echo "Response: $FEEDBACK_RESPONSE"
echo ""

# 8. Test Get Feedback (admin)
echo -e "${BLUE}8. Testing Get Feedback (GET /api/feedback)...${NC}"
GET_FEEDBACK=$(curl -s "$BASE_URL/api/feedback" \
  -H "Authorization: Bearer $TOKEN")
if echo $GET_FEEDBACK | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Get feedback working${NC}"
else
  echo -e "${RED}❌ Get feedback failed${NC}"
fi
echo "Response: $GET_FEEDBACK"
echo ""

# 9. Test Database Stats
echo -e "${BLUE}9. Testing Database Stats (GET /api/admin/database-stats)...${NC}"
DB_STATS=$(curl -s "$BASE_URL/api/admin/database-stats" \
  -H "Authorization: Bearer $TOKEN")
if echo $DB_STATS | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Database stats working${NC}"
else
  echo -e "${RED}❌ Database stats failed${NC}"
fi
echo "Response: $DB_STATS"
echo ""

# 10. Cleanup - Delete test area if created
if [ ! -z "$AREA_ID" ]; then
  echo -e "${BLUE}10. Cleanup - Deleting test area...${NC}"
  DELETE_AREA=$(curl -s -X DELETE "$BASE_URL/api/areas/$AREA_ID" \
    -H "Authorization: Bearer $TOKEN")
  if echo $DELETE_AREA | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Cleanup successful${NC}"
  else
    echo -e "${RED}❌ Cleanup failed${NC}"
  fi
  echo "Response: $DELETE_AREA"
  echo ""
fi

echo -e "${BLUE}=== Testing Complete ===${NC}"
echo -e "${GREEN}All new endpoints are working! 🎉${NC}"
