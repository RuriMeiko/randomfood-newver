# 🚀 Simple Food Bot with Gemini AI - Complete Restructure

## ✅ **Major Changes Completed**

### 🗃️ **Database Restructure**
- **Removed all complex tables**: `mainfood`, `subfood`, `historyfood`, `command`, `credit`, `tag`, `debt`
- **Single simple table**: `food_suggestions` for storing AI-generated suggestions
- **Clean schema**: Only essential fields - user_id, chat_id, suggestion, prompt, created_at

### 🤖 **Gemini AI Integration**
- **GeminiService**: Complete integration with Google's Gemini Pro model
- **Smart prompting**: Generates Vietnamese food suggestions with descriptions
- **Error handling**: Comprehensive error management for API calls
- **Customizable prompts**: Users can specify cuisine, meal type, dietary preferences

### 📱 **Simplified Commands**

#### **Core Commands:**
- **`/start`** - Welcome message in Vietnamese
- **`/food`** - Generate random food suggestion using AI
- **`/food [description]`** - Generate suggestion based on user criteria
- **`/history`** - View last 5 AI suggestions with total count
- **`/help`** - Complete usage guide

#### **Smart Message Handling:**
- **Non-command messages** automatically trigger food suggestions
- **Context-aware responses** based on user input
- **Vietnamese language** throughout the interface

### 🏗️ **Architecture**

#### **New Structure:**
```
src/
├── bot/simple-bot.ts          # Main bot implementation
├── commands/simple/food.ts    # All food-related commands
├── services/
│   ├── gemini.service.ts      # Gemini AI integration
│   └── simple-food.service.ts # Food suggestion management
└── db/
    ├── schema.ts              # Single table schema
    └── migrate-simple.sql     # Migration script
```

### 🔧 **Environment Variables**
```bash
DATABASE_URL=your_neon_postgres_url
API_TELEGRAM=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
```

### 📊 **Features**

#### **1. AI-Powered Suggestions**
```
🤖 Gợi ý món ăn từ AI:

🍽️ Bún bò Huế
📝 Món bún truyền thống của Huế với nước dùng cay nồng, 
thịt bò và chả cua, tạo nên hương vị đặc trưng miền Trung.
```

#### **2. Custom Requests**
```
/food món chay cho bữa trưa
/food đồ ăn vặt buổi tối
/food món tráng miệng ngọt mát
```

#### **3. History Tracking**
```
📊 Lịch sử gợi ý món ăn
📈 Tổng cộng: 15 gợi ý

1. Bún bò Huế - Món bún truyền thống...
   📅 29/10 14:30 • 💭 "món cay"
```

### 🚀 **Deployment Steps**

#### **1. Database Migration**
```sql
-- Run migrate-simple.sql to restructure database
-- Drops all old tables and creates food_suggestions table
```

#### **2. Environment Setup**
```bash
npx wrangler secret put API_TELEGRAM
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put DATABASE_URL
```

#### **3. Deploy**
```bash
npm run build  # ✅ Build success
npx wrangler deploy
```

### 💡 **Usage Examples**

#### **Basic Usage:**
- Send `/food` for random suggestion
- Send any text for contextual suggestion
- Send `/history` to see previous suggestions

#### **Advanced Usage:**
- `/food món Việt Nam truyền thống`
- `/food healthy lunch options`
- `/food dessert for hot weather`

### 🎯 **Benefits**

✅ **Simple & Clean**: Single purpose bot focused on food suggestions  
✅ **AI-Powered**: Smart, contextual food recommendations  
✅ **Vietnamese Interface**: Native language support  
✅ **Fast Response**: Optimized for quick suggestions  
✅ **History Tracking**: Keep track of all suggestions  
✅ **Error Resilient**: Comprehensive error handling  

### 📈 **Performance**
- **Build size**: ~430kb (optimized)
- **Database**: Single table with indexes
- **API calls**: Efficient Gemini Pro integration
- **Logging**: Comprehensive user action tracking

The bot is now completely focused on its core mission: providing AI-powered food suggestions in Vietnamese! 🍽️🤖