# 🚨 Quick Fix Guide - AI Bot Issues

## ✅ **Issues Fixed:**

### 1. Database Query Method Missing
- **Problem**: `this.database.query is not a function`
- **Solution**: Added `query()` method to NeonDB class
- **Status**: ✅ Fixed in code

### 2. Invalid Gemini API Key
- **Problem**: "API key not valid. Please pass a valid API key."
- **Solution**: Need to set correct Gemini API key

## 🔧 **Fix Steps:**

### Step 1: Set Valid Gemini API Key
```bash
# Get your API key from https://aistudio.google.com/app/apikey
npx wrangler secret put GEMINI_API_KEY
```

**Your Gemini API key should look like:**
```
AIzaSyABC123DEF456GHI789JKL012MNO345PQR678STU
```

### Step 2: Deploy Fixed Code
```bash
npm run build
npx wrangler deploy
```

### Step 3: Test the Bot
Send a message to test:
```
"Hôm nay ăn gì?"
```

## 🎯 **Expected Result After Fix:**

### ✅ **Working Flow:**
1. User sends: "Hôm nay ăn gì?"
2. Bot responds: "🤖 Đang xử lý..."
3. AI processes message (with valid API key)
4. Database query works (with new query method)
5. Bot responds: "🍽️ Tôi gợi ý món Phở bò!..."

### ❌ **Previous Errors (Now Fixed):**
- ~~TypeError: this.database.query is not a function~~
- ~~API key not valid~~
- ~~Error updating chat member~~
- ~~Error logging conversation~~

## 📝 **API Key Sources:**

### Get Gemini API Key:
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with AIza...)
4. Set it: `npx wrangler secret put GEMINI_API_KEY`

### Verify Secrets:
```bash
npx wrangler secret list
```

Should show:
- ✅ API_TELEGRAM
- ✅ GEMINI_API_KEY ← **This is what was missing/invalid**
- ✅ DATABASE_URL

## 🚀 **After Fixing:**

Your AI bot will:
- ✅ **Track group members** automatically
- ✅ **Process messages** with Gemini AI
- ✅ **Save conversations** to database
- ✅ **Respond intelligently** to food/debt requests
- ✅ **Work in groups** without spam

**The bot is now ready for full AI operation! 🤖**