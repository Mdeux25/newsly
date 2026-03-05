#!/bin/bash

# Quick Manual API Tests
# Use this for quick manual testing of specific scenarios

API_URL="http://localhost:3000/api"

echo "======================================"
echo "  Quick API Test - Manual Testing"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Basic news fetch
echo -e "${BLUE}Test 1: Basic news fetch${NC}"
echo "GET /api/news?topic=technology&limit=5"
curl -s "${API_URL}/news?topic=technology&limit=5" | jq '.success, .count, .articles[0].title'
echo ""
echo "---"
echo ""

# Test 2: English + Saudi Arabia (NEW LOGIC)
echo -e "${BLUE}Test 2: English + Saudi Arabia (should filter by language)${NC}"
echo "GET /api/news?countries=sa&language=en&limit=5"
curl -s "${API_URL}/news?countries=sa&language=en&limit=5" | jq '.success, .count, .articles[] | {title: .title, source: .source, language: .language, country: .country}'
echo ""
echo "---"
echo ""

# Test 3: Countries + Region (region should be ignored)
echo -e "${BLUE}Test 3: Countries + Region (region should be IGNORED)${NC}"
echo "GET /api/news?countries=us,uk&region=middleeast&language=en&limit=5"
curl -s "${API_URL}/news?countries=us,uk&region=middleeast&language=en&limit=5" | jq '.success, .count, .articles[] | {source: .source, region: .region, country: .country}'
echo ""
echo "---"
echo ""

# Test 4: Region only (no countries)
echo -e "${BLUE}Test 4: Region only (should work normally)${NC}"
echo "GET /api/news?region=us&language=en&limit=5"
curl -s "${API_URL}/news?region=us&language=en&limit=5" | jq '.success, .count, .articles[] | {source: .source, region: .region}'
echo ""
echo "---"
echo ""

# Test 5: Trending topics
echo -e "${BLUE}Test 5: Trending topics${NC}"
echo "GET /api/trending"
curl -s "${API_URL}/trending" | jq '.success, .trending[0:5]'
echo ""
echo "---"
echo ""

# Test 6: System status
echo -e "${BLUE}Test 6: System status${NC}"
echo "GET /api/status"
curl -s "${API_URL}/status" | jq '.success, .database.totalArticles, .database.articlesToday'
echo ""
echo "---"
echo ""

echo -e "${GREEN}Quick tests complete!${NC}"
echo ""
echo "To see full test suite: ./run-tests.sh"
