#!/bin/bash
set -e

# Backup script for Sleekly Desktop v2
# Saves local SQLite database and user media files into a compressed backup archive

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PARENT_DIR="$HOME/sleekly-backups"
BACKUP_DIR="$BACKUP_PARENT_DIR/backup_$TIMESTAMP"
ARCHIVE_FILE="$BACKUP_PARENT_DIR/sleekly_backup_$TIMESTAMP.tar.gz"

echo "💾 Starting Sleekly Desktop v2 Backup..."

# 1. Resolve OS-specific App Data Directory
# Under macOS: ~/Library/Application Support/com.sleekly.desktop.v2
# Under Linux: ~/.local/share/com.sleekly.desktop.v2
if [[ "$OSTYPE" == "darwin"* ]]; then
    APP_DATA_DIR="$HOME/Library/Application Support/com.sleekly.desktop.v2"
else
    APP_DATA_DIR="$HOME/.local/share/com.sleekly.desktop.v2"
fi

DB_FILE="$APP_DATA_DIR/db/sleekly.db"
MEDIA_DIR="$APP_DATA_DIR/media"

# 2. Check if local app data exists
if [ ! -d "$APP_DATA_DIR" ]; then
    echo "⚠️ Warning: Sleekly local App Data directory not found."
    echo "Path checked: $APP_DATA_DIR"
    echo "Have you run the application yet?"
    exit 1
fi

echo "📂 Resolving native directories:"
echo "   - App Data: $APP_DATA_DIR"
echo "   - Database: $DB_FILE"
echo "   - Media Uploads: $MEDIA_DIR"

# 3. Create backup staging folder
mkdir -p "$BACKUP_DIR"

# 4. Copy local database (if exists)
if [ -f "$DB_FILE" ]; then
    echo "📝 Backing up SQLite database..."
    cp "$DB_FILE" "$BACKUP_DIR/sleekly.db"
    
    # Also backup WAL files if present to ensure data consistency
    if [ -f "${DB_FILE}-wal" ]; then
        cp "${DB_FILE}-wal" "$BACKUP_DIR/sleekly.db-wal"
    fi
    if [ -f "${DB_FILE}-shm" ]; then
        cp "${DB_FILE}-shm" "$BACKUP_DIR/sleekly.db-shm"
    fi
else
    echo "⚠️ SQLite database file not found. Skipping DB backup."
fi

# 5. Copy local media uploads (if folder exists and is not empty)
if [ -d "$MEDIA_DIR" ] && [ "$(ls -A "$MEDIA_DIR" 2>/dev/null)" ]; then
    echo "🖼️ Backing up local media uploads..."
    cp -R "$MEDIA_DIR" "$BACKUP_DIR/media"
else
    echo "ℹ️ Media folder is empty or does not exist. Skipping media backup."
fi

# 6. Create compressed archive
echo "📦 Packaging files into $ARCHIVE_FILE..."
mkdir -p "$BACKUP_PARENT_DIR"
tar -czf "$ARCHIVE_FILE" -C "$BACKUP_PARENT_DIR" "backup_$TIMESTAMP"

# 7. Clean up staging folder
rm -rf "$BACKUP_DIR"

echo "--------------------------------------------------------"
echo "✅ Backup Completed Successfully!"
echo "--------------------------------------------------------"
echo "📦 Archive saved to:"
echo "👉 $ARCHIVE_FILE"
echo "--------------------------------------------------------"
