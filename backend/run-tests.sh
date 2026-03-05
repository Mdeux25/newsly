#!/bin/bash

# News Aggregator API Test Runner
# Run this script to test the API filtering logic

set -e

echo "========================================="
echo "  News Aggregator API Test Runner"
echo "========================================="
echo ""

# Check if backend is running
echo "Checking if backend server is running..."
if curl -s http://localhost:3000/api/status > /dev/null 2>&1; then
    echo "✓ Backend is running"
else
    echo "✗ Backend is not running"
    echo ""
    echo "Please start the backend server first:"
    echo "  cd backend"
    echo "  npm start"
    echo ""
    exit 1
fi

echo ""
echo "Running filtering logic tests..."
echo ""

# Run the test suite
node backend/tests/filtering-api.test.js

echo ""
echo "Test run complete!"
