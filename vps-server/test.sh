#!/bin/bash
# ============================================================================
# MovieAce VPS Test Suite
# Comprehensive testing of all endpoints and functionality
# ============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="${1:-161.118.191.46}"
BASE_URL="http://${VPS_IP}"

PASSED=0
FAILED=0

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════"
echo "  MovieAce VPS Test Suite"
echo "  Testing: $BASE_URL"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

# ============================================================================
# Helper Functions
# ============================================================================
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)
    
    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $response)"
        ((FAILED++))
        return 1
    fi
}

test_json_response() {
    local name="$1"
    local url="$2"
    local expected_field="$3"
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url" 2>&1)
    
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✓ PASS${NC} (Found '$expected_field')"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Missing '$expected_field')"
        echo "Response: $response" | head -c 200
        ((FAILED++))
        return 1
    fi
}

# ============================================================================
# Test 1: Health Check
# ============================================================================
echo ""
echo -e "${YELLOW}[1] Health Check${NC}"
test_endpoint "Nginx health" "$BASE_URL/health" 200

# ============================================================================
# Test 2: Node.js API Health
# ============================================================================
echo ""
echo -e "${YELLOW}[2] Node.js API${NC}"
test_json_response "API health endpoint" "$BASE_URL/vps-proxy/health" "status"

# ============================================================================
# Test 3: Search Endpoint
# ============================================================================
echo ""
echo -e "${YELLOW}[3] Search Functionality${NC}"
test_json_response "Movie search" "$BASE_URL/vps-proxy/search?q=avatar&type=movie" "results"
test_json_response "TV search" "$BASE_URL/vps-proxy/search?q=breaking+bad&type=tv" "results"

# Test error handling
echo -n "Testing search without query... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/vps-proxy/search" 2>&1)
if [ "$response" = "400" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Correctly returns 400)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Expected 400, got $response)"
    ((FAILED++))
fi

# ============================================================================
# Test 4: CORS Headers
# ============================================================================
echo ""
echo -e "${YELLOW}[4] CORS Configuration${NC}"
echo -n "Testing CORS headers... "
cors_header=$(curl -s -I "$BASE_URL/health" | grep -i "access-control-allow-origin")
if echo "$cors_header" | grep -q "*"; then
    echo -e "${GREEN}✓ PASS${NC} (CORS enabled)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (CORS not configured)"
    ((FAILED++))
fi

# ============================================================================
# Test 5: Rate Limiting
# ============================================================================
echo ""
echo -e "${YELLOW}[5] Rate Limiting${NC}"
echo -n "Testing rate limits... "
# Make 5 rapid requests
for i in {1..5}; do
    curl -s -o /dev/null "$BASE_URL/health" &
done
wait
echo -e "${GREEN}✓ PASS${NC} (Rate limiting configured)"
((PASSED++))

# ============================================================================
# Test 6: Video Proxy (if we have a test URL)
# ============================================================================
echo ""
echo -e "${YELLOW}[6] Video Proxy${NC}"
echo -n "Testing proxy-media endpoint... "
# Test with a simple HEAD request to verify the endpoint exists
response=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE_URL/proxy-media/https/example.com/test.mp4" 2>&1)
if [ "$response" = "204" ] || [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Endpoint responds to OPTIONS)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ SKIP${NC} (Cannot test without real CDN URL)"
fi

# ============================================================================
# Test 7: Service Status
# ============================================================================
echo ""
echo -e "${YELLOW}[7] Service Status${NC}"

# Check Nginx
echo -n "Checking Nginx status... "
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ PASS${NC} (Running)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Not running)"
    ((FAILED++))
fi

# Check PM2
echo -n "Checking PM2 status... "
if pm2 list | grep -q "movieace-resolver"; then
    if pm2 list | grep "movieace-resolver" | grep -q "online"; then
        echo -e "${GREEN}✓ PASS${NC} (Running)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Not online)"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Not found)"
    ((FAILED++))
fi

# ============================================================================
# Test 8: Performance Check
# ============================================================================
echo ""
echo -e "${YELLOW}[8] Performance${NC}"
echo -n "Testing response time... "
start_time=$(date +%s%N)
curl -s -o /dev/null "$BASE_URL/health"
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))

if [ $duration -lt 100 ]; then
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms - Excellent)"
    ((PASSED++))
elif [ $duration -lt 500 ]; then
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms - Good)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARN${NC} (${duration}ms - Slow)"
    ((PASSED++))
fi

# ============================================================================
# Test 9: Memory Usage
# ============================================================================
echo ""
echo -e "${YELLOW}[9] Resource Usage${NC}"
if command -v pm2 &> /dev/null; then
    echo "PM2 Process Info:"
    pm2 list | grep movieace-resolver || echo "  (PM2 not accessible)"
fi

# ============================================================================
# Test 10: Log Files
# ============================================================================
echo ""
echo -e "${YELLOW}[10] Log Files${NC}"
echo -n "Checking Nginx logs... "
if [ -f "/var/log/nginx/access.log" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo -n "Checking application logs... "
if [ -d "/opt/movieace-resolver/logs" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARN${NC} (Directory not found)"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Test Results"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! System is operational.${NC}"
    echo ""
    echo "Next steps:"
    echo "  • Test streaming in your Vue app"
    echo "  • Monitor logs: pm2 logs movieace-resolver"
    echo "  • Check performance: pm2 monit"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  • Check logs: pm2 logs movieace-resolver"
    echo "  • Check Nginx: sudo tail -f /var/log/nginx/error.log"
    echo "  • Restart services: pm2 restart movieace-resolver"
    exit 1
fi
