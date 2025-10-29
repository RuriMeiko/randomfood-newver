# Fix Gemini API Key Issue

## Problem
The Gemini API is returning "API key not valid" error.

## Solutions

### 1. Set the Gemini API Key
```bash
# Get your Gemini API key from https://aistudio.google.com/app/apikey
npx wrangler secret put GEMINI_API_KEY
# Enter your actual Gemini API key when prompted
```

### 2. Verify the API Key Format
Your Gemini API key should look like:
```
AIzaSyABC123DEF456GHI789JKL012MNO345PQR678STU
```

### 3. Test API Key Manually
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Hello"
          }
        ]
      }
    ]
  }'
```

### 4. Check Current Secrets
```bash
npx wrangler secret list
```

Should show:
- API_TELEGRAM
- GEMINI_API_KEY  
- DATABASE_URL

### 5. Update the Secret
```bash
npx wrangler secret put GEMINI_API_KEY
# Paste your valid API key from Google AI Studio
```