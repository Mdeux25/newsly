#!/bin/bash

# News Aggregator - Quick Setup Script
# This script helps you set up the database and run the migration

set -e  # Exit on any error

echo "📰 News Aggregator Database Setup"
echo "===================================="
echo ""

# Check if MySQL is running
check_mysql() {
  if command -v mysql &> /dev/null; then
    echo "✅ MySQL client found"
    return 0
  else
    echo "⚠️  MySQL client not found"
    return 1
  fi
}

# Check if Docker is running
check_docker() {
  if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "✅ Docker is running"
    return 0
  else
    echo "⚠️  Docker is not running"
    return 1
  fi
}

# Main setup
main() {
  echo "🔍 Checking prerequisites..."
  echo ""

  # Check for Node.js
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
  fi
  echo "✅ Node.js $(node --version) found"

  # Check for npm
  if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
  fi
  echo "✅ npm $(npm --version) found"

  echo ""
  echo "🔧 Choose MySQL setup method:"
  echo "1) Docker (recommended - automatic setup)"
  echo "2) Local MySQL (manual setup required)"
  echo "3) Skip MySQL setup (already configured)"
  echo ""
  read -p "Enter choice [1-3]: " choice

  case $choice in
    1)
      echo ""
      echo "🐳 Setting up MySQL with Docker..."
      if ! check_docker; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
      fi

      cd "$(dirname "$0")/../.."
      echo "   Starting MySQL container..."
      docker-compose up -d mysql

      echo "   Waiting for MySQL to be ready (this may take 30 seconds)..."
      sleep 5

      # Wait for MySQL health check
      for i in {1..30}; do
        if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -prootpassword &> /dev/null; then
          echo "✅ MySQL is ready!"
          break
        fi
        echo -n "."
        sleep 2
      done
      echo ""
      ;;

    2)
      echo ""
      echo "📝 Manual MySQL Setup Instructions:"
      echo "   1. Install MySQL 8.0+"
      echo "   2. Start MySQL service"
      echo "   3. Run these SQL commands:"
      echo ""
      echo "      CREATE DATABASE news_aggregator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
      echo "      CREATE USER 'news_user'@'localhost' IDENTIFIED BY 'news_password';"
      echo "      GRANT ALL PRIVILEGES ON news_aggregator.* TO 'news_user'@'localhost';"
      echo "      FLUSH PRIVILEGES;"
      echo ""
      echo "   4. Update backend/.env with your MySQL credentials"
      echo ""
      read -p "Press Enter when done..."
      ;;

    3)
      echo "⏭️  Skipping MySQL setup..."
      ;;

    *)
      echo "❌ Invalid choice. Exiting."
      exit 1
      ;;
  esac

  echo ""
  echo "📦 Installing npm dependencies..."
  cd "$(dirname "$0")/.."
  npm install

  echo ""
  echo "🔧 Checking .env configuration..."
  if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env and add your NEWSAPI_KEY!"
    echo ""
    read -p "Press Enter when you've added your API key..."
  else
    echo "✅ .env file exists"
  fi

  echo ""
  echo "🗄️  Running database migration..."
  npm run migrate

  echo ""
  echo "✅ Setup complete!"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Start the backend:"
  echo "      cd backend && npm run dev"
  echo ""
  echo "   2. In a new terminal, start the frontend:"
  echo "      cd frontend && npm run dev"
  echo ""
  echo "   3. Open your browser:"
  echo "      http://localhost:5173"
  echo ""
  echo "   4. Check system status:"
  echo "      http://localhost:3001/api/status"
  echo ""
  echo "🎉 Happy news aggregating!"
}

# Run main function
main
