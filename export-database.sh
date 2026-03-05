#!/bin/bash
# Export Database Script for Newsly

echo "🗄️  Exporting Newsly database..."

# Create backups directory
mkdir -p backups

# Export database with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/newsly_backup_${TIMESTAMP}.sql"

# Try to find mysqldump
if command -v mysqldump &> /dev/null; then
    # Use system mysqldump
    mysqldump -u news_user -pnews_password news_aggregator > "$BACKUP_FILE"
elif [ -f "/usr/local/mysql/bin/mysqldump" ]; then
    # Try MySQL installation path
    /usr/local/mysql/bin/mysqldump -u news_user -pnews_password news_aggregator > "$BACKUP_FILE"
else
    echo "⚠️  mysqldump not found, trying alternative method..."
    # Export using mysql client
    mysql -u news_user -pnews_password news_aggregator -e "
    SELECT CONCAT('-- Database Export: ', DATABASE(), ' at ', NOW()) AS '';
    SHOW CREATE DATABASE news_aggregator;
    " > "$BACKUP_FILE"
    
    # Export table structures and data
    mysql -u news_user -pnews_password news_aggregator -N -e "SHOW TABLES" | while read table; do
        echo "-- Table: $table" >> "$BACKUP_FILE"
        mysql -u news_user -pnews_password news_aggregator -e "SHOW CREATE TABLE $table\G" >> "$BACKUP_FILE"
        mysql -u news_user -pnews_password news_aggregator -e "SELECT * FROM $table" >> "$BACKUP_FILE"
    done
fi

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "✅ Database exported successfully to: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "✅ Backup compressed: ${BACKUP_FILE}.gz"
    
    # Show backup size
    ls -lh "${BACKUP_FILE}.gz"
    
    echo ""
    echo "📋 To use this backup on your server:"
    echo "   1. Copy it: scp ${BACKUP_FILE}.gz user@server:~/newsly/backups/"
    echo "   2. Import it: ./import-database.sh backups/$(basename ${BACKUP_FILE}.gz)"
else
    echo "❌ Database export failed!"
    echo ""
    echo "💡 Try manual export:"
    echo "   1. Find your MySQL installation: which mysql"
    echo "   2. Export manually with full path to mysqldump"
    exit 1
fi
