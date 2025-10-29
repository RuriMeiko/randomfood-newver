# 🤖 AI Food & Debt Bot - Complete Deployment Guide

## ✅ **AI System Complete!**

Your bot has been completely redesigned with Gemini 2.0 Flash AI for intelligent food suggestions and natural language debt tracking.

### 🧠 **AI Features**

#### **🍽️ Smart Food Suggestions**
- **Natural language processing**: "Hôm nay ăn gì?" → AI suggests Vietnamese dishes
- **Context aware**: AI asks follow-up questions to understand preferences
- **Vietnamese focused**: Prioritizes easy-to-make Vietnamese food
- **Interactive**: AI can ask "Bạn thích cay không?" to refine suggestions

#### **💰 Intelligent Debt Tracking**
- **Natural language detection**: "Tôi nợ An 50k ăn trưa" → Auto-creates debt record
- **Smart user matching**: AI matches names to actual group members
- **Payment tracking**: "Đã trả tiền cho Bình" → Marks debt as paid
- **Balance queries**: "Ai nợ ai?" → Shows debt summary

#### **💬 Smart Conversation**
- **Context understanding**: AI knows who's talking and chat history
- **Group awareness**: Tracks group members automatically
- **Response timing**: Shows AI processing time for transparency

### 🗃️ **New Database Schema**

#### **Tables Created:**
1. **`food_suggestions`** - AI food recommendations with full context
2. **`debts`** - Natural language processed debt tracking
3. **`chat_members`** - Auto-tracked group members for AI context
4. **`ai_conversations`** - Complete AI interaction log

### 📱 **Commands Available**

#### **User Commands:**
- **`/start`** - AI introduction with context-aware welcome
- **`/history`** - View AI food suggestions history
- **`/debts`** - View unpaid debts in group
- **`/debts all`** - View all debts (paid + unpaid)
- **`/help`** - Complete AI bot usage guide

#### **Natural Interactions:**
```
"Hôm nay ăn gì?" → AI suggests food
"Tôi nợ An 50k" → Creates debt record
"Đã trả tiền cho Bình" → Marks debt paid
"Ai nợ ai?" → Shows debt summary
"Món chay cho bữa trưa" → Vegetarian suggestions
```

### 🚀 **Deployment Steps**

#### **1. Database Migration**
Run the SQL in `src/db/ai-migration.sql` on your Neon database:
```sql
-- Creates 4 new tables with proper indexes
-- Drops all old tables
-- Optimized for AI workloads
```

#### **2. Environment Variables**
```bash
# Telegram Bot Token
npx wrangler secret put API_TELEGRAM

# Gemini 2.0 Flash API Key (get from https://aistudio.google.com/app/apikey)
npx wrangler secret put GEMINI_API_KEY

# Neon Database URL
npx wrangler secret put DATABASE_URL
```

#### **3. Deploy**
```bash
npm run build  # ✅ 406.3kb - AI-powered build
npx wrangler deploy
```

### 🎯 **AI System Prompts**

The bot uses sophisticated system prompts to:
- **Analyze user intent**: Food, debt, or conversation
- **Extract entities**: Usernames, amounts, food preferences
- **Maintain context**: Group members, chat history
- **Generate responses**: Natural Vietnamese responses
- **Return structured JSON**: For database operations

### 💡 **Usage Examples**

#### **🍽️ Food Suggestions:**
```
User: "Đói bụng rồi, ăn gì giờ?"
AI: "🍽️ Tôi gợi ý món Phở gà! 
     📝 Món phở truyền thống với nước dùng trong, thịt gà mềm...
     💭 Bạn có thích ăn cay không? Tôi có thể gợi ý thêm món khác!"
```

#### **💰 Debt Tracking:**
```
User: "Tôi nợ Minh 100k tiền ăn hôm qua"
AI: "💰 Đã ghi nhận: Bạn nợ Minh 100,000 VND (tiền ăn hôm qua)
     🤖 Đã cập nhật nợ (245ms)"

User: "Đã trả tiền cho Minh rồi"  
AI: "💰 Đã đánh dấu khoản nợ với Minh là đã trả!
     ✅ Cập nhật thành công"
```

#### **👥 Group Behavior:**
```
- Private chat: AI responds to all messages
- Group chat: AI responds only when mentioned
- Auto-tracks group members for debt resolution
- Context-aware responses based on chat type
```

### 📊 **Performance & Monitoring**

#### **AI Response Metrics:**
- **Processing time**: Displayed with each response
- **Action classification**: food_suggestion, debt_tracking, conversation
- **Success tracking**: All interactions logged to database
- **Error handling**: Graceful fallbacks for AI failures

#### **Build Status:**
```bash
✅ build/index.mjs  406.3kb
⚡ Done in 270ms
```

### 🔧 **Technical Architecture**

#### **AI Flow:**
1. **Input**: User message + group context
2. **Processing**: Gemini 2.0 Flash analyzes intent
3. **Classification**: food_suggestion, debt_tracking, or conversation
4. **Action**: Database updates + response generation
5. **Output**: Smart Vietnamese response with context

#### **Database Integration:**
- **Auto-tracking**: Group members updated automatically
- **Relationship mapping**: AI resolves usernames to user IDs
- **History preservation**: All interactions stored for learning
- **Performance optimized**: Proper indexes for fast queries

### 🎉 **Ready to Go!**

Your AI bot now:
- ✅ **Understands Vietnamese naturally**
- ✅ **Tracks debts automatically from conversation**
- ✅ **Provides intelligent food suggestions**
- ✅ **Maintains group member context**
- ✅ **Logs everything for improvements**
- ✅ **Responds appropriately in groups vs private**

**Deploy and start chatting with your AI! 🚀**

Example first message: "Chào bot! Hôm nay ăn gì ngon nhỉ?"