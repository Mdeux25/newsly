#!/bin/bash

echo "🚀 Starting News Aggregator in Development Mode..."
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example backend/.env
    echo "✅ Created backend/.env"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your API keys!"
    echo "   - Get NewsAPI key: https://newsapi.org/register"
    echo "   - Get GNews key (optional): https://gnews.io/register"
    echo ""
    read -p "Press Enter once you've added your API keys..."
fi

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Starting servers..."
echo "   Backend: http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers using docker-compose dev profile
docker-compose --profile dev up
