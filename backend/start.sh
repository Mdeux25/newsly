#!/bin/sh
# Startup script for Render - runs migrations then starts server

echo "🔄 Running database migrations..."

# Use Node.js migration script (works with any MySQL version)
node migrate-db.js

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully!"
else
  echo "❌ Migration failed! Check database credentials."
  exit 1
fi

echo "🚀 Starting Node.js server..."
exec node server.js
