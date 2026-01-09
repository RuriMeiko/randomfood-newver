#!/bin/bash

# Database Initialization Script
# Run this to setup database for the first time

echo "🗄️  Initializing database..."

if [ -z "$NEON_DATABASE_URL" ]; then
  echo "❌ Error: NEON_DATABASE_URL environment variable not set"
  echo "Please set it in .env or export it:"
  echo "  export NEON_DATABASE_URL='postgresql://user:pass@host/db'"
  exit 1
fi

echo "📊 Running SQL script..."
psql "$NEON_DATABASE_URL" -f init-database.sql

if [ $? -eq 0 ]; then
  echo "✅ Database initialized successfully!"
  echo ""
  echo "Next steps:"
  echo "  1. npm run deploy"
  echo "  2. Test with Telegram bot"
  echo ""
  echo "Example commands to test:"
  echo "  - mây ơi"
  echo "  - anh nợ Long 500k"
  echo "  - em nợ ai bao nhiêu?"
else
  echo "❌ Failed to initialize database"
  exit 1
fi
