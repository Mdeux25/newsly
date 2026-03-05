#!/bin/bash
# Import Database Script for Newsly (Run on Server)

echo "🗄️  Importing Newsly database..."

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: ./import-database.sh <backup_file.sql.gz>"
    echo "Example: ./import-database.sh backups/newsly_backup_20260305_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Decompressing backup..."
    gunzip -c "$BACKUP_FILE" > temp_import.sql
    IMPORT_FILE="temp_import.sql"
else
    IMPORT_FILE="$BACKUP_FILE"
fi

# Wait for MySQL container to be ready
echo "⏳ Waiting for MySQL container..."
sleep 5

# Import into Docker MySQL
echo "📥 Importing database..."
docker exec -i newsly-mysql mysql -u news_user -pnews_password news_aggregator < "$IMPORT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database imported successfully!"
    
    # Cleanup temp file
    if [ -f "temp_import.sql" ]; then
        rm temp_import.sql
    fi
else
    echo "❌ Database import failed!"
    exit 1
fi
