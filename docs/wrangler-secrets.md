# Wrangler Secrets Setup

Run these commands to set up your environment variables:

```bash
# Set Telegram Bot Token
npx wrangler secret put API_TELEGRAM

# Set Gemini API Key  
npx wrangler secret put GEMINI_API_KEY

# Set Database URL
npx wrangler secret put DATABASE_URL
```

## How to get Gemini API Key:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and use it in the wrangler secret command

## Database Migration:

Run the SQL commands in `src/db/migrate-simple.sql` on your Neon database to restructure the tables.