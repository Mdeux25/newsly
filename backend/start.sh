#!/bin/sh
# Startup script for Render - runs migrations then starts server

echo "🔄 Running database migrations..."

# Run migrations (install mysql client if needed)
if command -v mysql > /dev/null 2>&1; then
  # MySQL client available, run migrations
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < /app/migrations/001_initial_schema.sql 2>/dev/null || echo "⚠️  Initial schema already exists"
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < /app/migrations/002_llm_features.sql 2>/dev/null || echo "⚠️  LLM features already exist"
  echo "✅ Migrations completed"
else
  echo "⚠️  MySQL client not available, skipping migrations"
  echo "⚠️  Tables must be created manually"
fi

echo "🚀 Starting Node.js server..."
exec node server.js
