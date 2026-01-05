# Telegram Debt Bot - Autonomous AI Agent

Bot Telegram quản lý nợ thông minh với AI agent tự động, hỗ trợ khấu trừ nợ qua lại và API key rotation.

---

## 🎯 Tính Năng Chính

- ✅ **Ghi nợ tự động:** "anh nợ Long 500k hôm qua mua cafe"
- ✅ **Xem nợ:** "em nợ ai bao nhiêu?" 
- ✅ **Trả nợ:** "anh trả Long 200k"
- ✅ **Khấu trừ nợ tự động:** A nợ B 500k, B nợ A 300k → A nợ B 200k
- ✅ **AI tự học database schema** (không hardcode)
- ✅ **API key rotation tự động** với rate limiting
- ✅ **Bot có cảm xúc** - Emotional state tracking
- ✅ **Hỗ trợ chat riêng và nhóm**

---

## 🚀 Quick Start

```bash
# 1. Clone & Install
git clone https://github.com/RuriMeiko/randomfood-newver.git
cd randomfood-newver
npm install

# 2. Setup Database
psql $NEON_DATABASE_URL -f migrations/init-database.sql
psql $NEON_DATABASE_URL -f migrations/init-api-keys.sql

# 3. Insert API Keys
psql $NEON_DATABASE_URL << EOF
INSERT INTO api_keys (key_name, api_key, rpm_limit, rpd_limit, is_active)
VALUES 
  ('primary', 'AIza...your_gemini_key...', 5, 20, TRUE),
  ('backup', 'AIza...another_key...', 5, 20, TRUE);
EOF

# 4. Configure Environment
cat > .dev.vars << EOF
API_TELEGRAM=your_telegram_bot_token
NEON_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
WEBHOOK_ADMIN_USER=admin
WEBHOOK_ADMIN_PASSWORD=admin123
EOF

# 5. Test Local
npm run dev

# 6. Deploy Production
npm run deploy
```

---

## 📊 Luồng Xử Lý Message (End-to-End)

### 1️⃣ **Entry Point: Telegram Webhook**

```
Telegram → POST /webhook → Cloudflare Worker
```

**File:** `src/index.ts`

**Logic:**
```typescript
// Nhận message từ Telegram
const message = body.message;

// Check có nên xử lý không?
if (shouldRespondInGroup(message)) {
  // ✅ Trigger bot: Private chat HOẶC group có keywords/reply
  ctx.waitUntil(aiBot.processMessage(...));
} else {
  // 🚫 Không trigger: Chỉ lưu message vào DB để có context
  ctx.waitUntil(db.saveUserMessage(...));
}
```

**Trigger Conditions (Group):**
- Reply to bot message
- Mention `@meismaybot`
- Keywords: `nợ`, `mây`, `meismaybot`

**Non-blocking:** Dùng `ctx.waitUntil()` để không block Telegram webhook response.

---

### 2️⃣ **Bot Orchestration Layer**

**File:** `src/ai-bot-autonomous.ts`

**Class:** `AIBotAutonomous`

**Flow:**
```
processMessageWithMessagesAndStickers()
│
├─ Step 1: Parallel Operations
│   ├─ sendChatAction('typing')     # Show typing indicator
│   └─ ensureUserAndGroup()         # Tạo user/group nếu chưa có
│
├─ Step 1.5: Save User Message
│   └─ saveUserMessage()            # Lưu message ngay để không mất data
│
├─ Step 2: Build Context
│   └─ contextBuilder.buildContext()
│       ├─ Get recent 50 messages
│       ├─ Get emotional state
│       └─ Get user/chat info
│
├─ Step 3: Run AI Agent
│   └─ aiAnalyzer.analyzeAndExecuteWithMessages()
│       ├─ Initialize API key manager
│       ├─ Build prompt with context
│       └─ Tool calling loop (max 10 iterations)
│
└─ Step 4: Send Messages
    └─ For each message:
        ├─ Keep typing indicator alive (setInterval 4s)
        ├─ Wait natural delay
        └─ Send message
```

**Key Points:**
- ✅ Non-blocking design
- ✅ Save message TRƯỚC khi AI processing (data safety)
- ✅ Typing indicator persistent (không nhấp nháy)

---

### 3️⃣ **Context Builder: Schema-Agnostic**

**File:** `src/services/context-builder-autonomous.ts`

**Philosophy:** Không hardcode database schema. AI tự khám phá.

**Context Provided:**
```
=== CURRENT TIME ===
Vietnam timezone (Asia/Ho_Chi_Minh)

=== EMOTIONAL STATE ===
happiness: 0.65, energy: 0.70, ...

=== CURRENT USER ===
Name, Telegram ID, Database ID, Username

=== CURRENT CHAT ===
Type (private/group), Chat ID, Group ID

=== RECENT CONVERSATION (50 messages) ===
[timestamp] User: message text

=== IMPORTANT ===
You do NOT have database schema.
Use tools to inspect and query database.
```

**Không cung cấp:**
- ❌ Database tables
- ❌ Columns
- ❌ Relationships
- ❌ Existing data

**AI phải dùng tools để:**
1. `inspect_schema` → Xem có table nào
2. `describe_table` → Xem columns của table
3. `execute_sql` → Query/insert data

---

### 4️⃣ **AI Analyzer: Tool Calling Loop**

**File:** `src/services/ai-analyzer-autonomous.ts`

**Model:** Google Gemini Flash với function calling

**Flow:**
```
analyzeAndExecuteWithMessages()
│
├─ ensureInitialized()
│   └─ Wait for ApiKeyManager to load keys from DB
│
├─ buildPromptWithContext()
│   └─ Combine user message + context
│
└─ toolCallingLoop() ← MAX 10 ITERATIONS
    │
    ├─ ApiKeyManager.executeWithRetry()
    │   ├─ getNextKey() → Pick available key (check RPM/RPD)
    │   ├─ incrementRequestCount() → Update counter in DB
    │   └─ models.generateContent({ tools: [...] })
    │
    ├─ [No tool calls] → Parse final JSON response
    │   └─ Return: { messages: [...], intent: '...' }
    │
    └─ [Has tool calls]
        ├─ Add AI response to conversation
        ├─ Execute tools via ToolExecutor
        ├─ Add tool results to conversation
        └─ Loop again (max 10 times)
```

**Tool Calling Example:**
```javascript
// Iteration 1: AI calls inspect_schema
AI: functionCall(name: "inspect_schema")

// Iteration 2: AI calls describe_table
User: functionResponse({ tables: [...] })
AI: functionCall(name: "describe_table", args: { table_name: "debts" })

// Iteration 3: AI calls execute_sql
User: functionResponse({ columns: [...] })
AI: functionCall(name: "execute_sql", args: { 
  query: "SELECT * FROM debts WHERE creditor_id = $1",
  params: [123]
})

// Iteration 4: AI returns final response
User: functionResponse({ data: [...] })
AI: { 
  messages: [
    { text: "Anh đang nợ Long 500k nha", delay: "1000" }
  ],
  intent: "check_debt"
}
```

---

### 5️⃣ **API Key Manager: Database-Backed**

**File:** `src/services/api-key-manager.ts`

**Architecture:** API keys lưu trong DB thay vì environment variables.

**Table Schema:**
```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  rpm_limit INTEGER DEFAULT 5,      -- Requests per minute
  rpd_limit INTEGER DEFAULT 20,     -- Requests per day
  requests_per_minute INTEGER DEFAULT 0,
  requests_per_day INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMP,
  failure_count INTEGER DEFAULT 0,
  last_failure TIMESTAMP
);
```

**Flow:**
```
initialize()
├─ Load all active keys from DB (Drizzle ORM)
└─ Store in memory cache

getNextKey()
├─ Loop through keys
├─ Refresh key from DB (get fresh counters)
├─ Check: is_blocked? rpm >= limit? rpd >= limit?
└─ Return first available key

createClient()
├─ getNextKey()
├─ incrementRequestCount() → Call SQL function
│   └─ UPDATE counters atomically
└─ Return GoogleGenAI client

executeWithRetry() ← Automatic retry on 429
├─ Try 1: createClient() + execute operation
├─ [Success] → reportSuccess() → Reset failure count
└─ [429 Error] → reportFailure() → Block key + Rotate
    └─ Try 2: Use next key...
```

**Auto-Reset Counters:**
```sql
-- PostgreSQL Triggers
CREATE FUNCTION reset_rpm_counters() ... -- Every minute
CREATE FUNCTION reset_rpd_counters() ... -- Every day
```

**Optimization:**
- ✅ `updateSingleKeyCache()` thay vì `refreshKeys()`
- ✅ Giảm DB queries từ O(n) → O(1)
- ✅ Query time: 200ms → 50ms

---

### 6️⃣ **Tool Executor**

**File:** `src/tools/executor.ts`

**Available Tools:**

1. **`inspect_schema`**
   ```typescript
   // Lấy toàn bộ database schema
   // Returns: { tables: [...], views: [...] }
   ```

2. **`describe_table`**
   ```typescript
   // Mô tả columns của 1 table
   // Args: { table_name: string }
   // Returns: { columns: [...], constraints: [...] }
   ```

3. **`list_tables`**
   ```typescript
   // List tất cả tables
   // Returns: { tables: ["debts", "tg_users", ...] }
   ```

4. **`execute_sql`**
   ```typescript
   // Execute SQL query
   // Args: { 
   //   query: string,
   //   params: any[],
   //   reason: string  // Giải thích tại sao cần query
   // }
   // Returns: Query result as JSON
   ```

5. **`analyze_interaction`**
   ```typescript
   // Update bot's emotional state
   // Args: {
   //   valence: number,      // -1 to 1
   //   intensity: number,    // 0 to 1
   //   target_emotions: [...],
   //   context: string
   // }
   ```

**Tool Execution:**
```typescript
async executeTool(toolCall, context) {
  switch (toolCall.name) {
    case "execute_sql":
      return await dbService.executeToolSql(
        toolCall.args.query,
        toolCall.args.params,
        { userId, groupId, reason, userMessage }
      );
    // ...
  }
}
```

---

### 7️⃣ **Database Service**

**File:** `src/services/database.ts`

**Tech:** Drizzle ORM + Neon PostgreSQL

**Key Methods:**

```typescript
// User & Group Management
ensureUserAndGroup(message)    // Create if not exists
getUserId(telegramId)           // Get internal user ID
getGroupId(chatId)              // Get internal group ID

// Message History
saveUserMessage(message)        // Save to chat_messages
getRecentMessages(chatId, limit=50)

// Tool SQL Execution
executeToolSql(query, params, context)
  ├─ Validate query (no DELETE without WHERE)
  ├─ Log: userId, groupId, reason
  └─ Execute with timeout

// Schema Inspection
inspectSchema()                 // Get all tables/views
describeTable(tableName)        // Get columns/constraints
listTables()                    // Simple list
```

---

### 8️⃣ **Response Flow**

**Final Response Format:**
```json
{
  "messages": [
    { "text": "Oke anh!", "delay": "800" },
    { "text": "Em đã ghi là anh nợ Long 500k rồi nha 💰", "delay": "1200" }
  ],
  "intent": "record_debt"
}
```

**Sending to Telegram:**
```typescript
// Keep typing indicator alive
const typingInterval = setInterval(() => {
  telegramApi.sendChatAction(chatId, 'typing');
}, 4000); // Refresh every 4s (expires after 5s)

try {
  for (const msg of messages) {
    await sleep(parseInt(msg.delay));
    await telegramApi.sendMessage({
      chat_id: chatId,
      text: msg.text
    });
  }
} finally {
  clearInterval(typingInterval);
}
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram API                            │
└────────────────────────┬────────────────────────────────────┘
                         │ Webhook
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (index.ts)                   │
│  - Webhook handler                                          │
│  - shouldRespondInGroup() logic                             │
│  - Non-blocking with ctx.waitUntil()                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         AIBotAutonomous (ai-bot-autonomous.ts)              │
│  Orchestrates: Context → AI → Response                     │
└───┬─────────────┬────────────────┬────────────────┬─────────┘
    │             │                │                │
    ▼             ▼                ▼                ▼
┌────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────────┐
│Database│  │Context   │  │AIAnalyzer    │  │TelegramApi  │
│Service │  │Builder   │  │Service       │  │             │
└───┬────┘  └────┬─────┘  └──────┬───────┘  └─────────────┘
    │            │                │
    │            │                ▼
    │            │         ┌──────────────┐
    │            │         │ApiKeyManager │
    │            │         │(DB-backed)   │
    │            │         └──────┬───────┘
    │            │                │
    ▼            ▼                ▼
┌─────────────────────────────────────────┐
│      Neon PostgreSQL Database           │
│  - tg_users                             │
│  - tg_groups                            │
│  - debts                                │
│  - chat_messages                        │
│  - bot_emotional_state                  │
│  - api_keys ← KEY MANAGEMENT            │
└─────────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ToolExecutor  │
    │- inspect     │
    │- describe    │
    │- execute_sql │
    │- analyze     │
    └──────────────┘
```

---

## 🗄️ Database Schema

### Core Tables

**1. tg_users** - Telegram users
```sql
- id (serial)
- telegram_id (bigint, unique)
- first_name, last_name, username
- real_name (custom name)
- created_at, updated_at
```

**2. tg_groups** - Telegram groups
```sql
- id (serial)
- telegram_chat_id (bigint, unique)
- title, type (group/supergroup)
```

**3. debts** - Debt tracking
```sql
- id (serial)
- creditor_id, debtor_id (FK to tg_users)
- amount (numeric)
- description
- group_id (FK to tg_groups, nullable)
- created_at
```

**4. chat_messages** - Conversation history
```sql
- id (serial)
- chat_id (text)
- sender ('user' or 'ai')
- sender_tg_id (bigint, nullable)
- message_text
- delay_ms, intent
- sql_query, sql_params (for debugging)
- created_at
```

**5. bot_emotional_state** - Bot's emotions
```sql
- id (serial)
- happiness, sadness, anger, fear, surprise, disgust
- energy, stress
- last_interaction_tg_id
- updated_at
```

**6. api_keys** - API key management ⭐
```sql
- id (serial)
- key_name (text, unique)
- api_key (text)
- rpm_limit, rpd_limit (rate limits)
- requests_per_minute, requests_per_day (counters)
- is_active, is_blocked
- failure_count, last_failure
- created_at, updated_at
```

### Views

**debts_detailed** - Consolidated debt view
```sql
SELECT 
  creditor_name,
  debtor_name,
  SUM(amount) as total_amount,
  COUNT(*) as debt_count
FROM debts
JOIN tg_users ...
GROUP BY ...
```

---

## 🔑 API Key Management

### Why Database-Backed?

**Problems với Environment Variables:**
- ❌ Cần redeploy để thêm/xóa keys
- ❌ Không track usage per key
- ❌ Không có automatic rotation
- ❌ Khó monitor và debug

**Solutions với Database:**
- ✅ Add/remove keys không cần redeploy
- ✅ Track RPM/RPD per key real-time
- ✅ Auto-rotate khi hit limit
- ✅ Auto-block khi có lỗi 429
- ✅ PostgreSQL triggers auto-reset counters

### Rate Limits (Gemini Free Tier)

- **RPM:** 5 requests per minute per key
- **RPD:** 20 requests per day per key

### Rotation Logic

```
Request comes in
├─ Get next available key
│   ├─ Check: requests_per_minute < 5?
│   ├─ Check: requests_per_day < 20?
│   └─ Check: !is_blocked?
│
├─ [Available] → Use this key
│   └─ Increment counters
│
└─ [Not available] → Try next key
    └─ Loop through all keys
```

### Auto-Reset

```sql
-- Trigger: Every minute (PostgreSQL cron)
UPDATE api_keys SET requests_per_minute = 0;

-- Trigger: Every day at 00:00 UTC
UPDATE api_keys SET requests_per_day = 0;
```

### Adding New Keys

```sql
INSERT INTO api_keys (key_name, api_key, rpm_limit, rpd_limit, is_active)
VALUES ('key_3', 'AIza...', 5, 20, TRUE);
```

Không cần restart worker!

---

## 🎭 Emotion System

Bot có cảm xúc và thay đổi theo tương tác:

```typescript
interface EmotionalState {
  happiness: number;    // -1 to 1
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  energy: number;       // 0 to 1
  stress: number;
}
```

**Update qua tool:**
```javascript
analyze_interaction({
  valence: 0.8,        // Positive interaction
  intensity: 0.6,
  target_emotions: ['happiness', 'energy'],
  context: "User praised the bot"
})
```

**Emotional decay:** Emotions gradually return to neutral over time.

---

## 💰 Debt Consolidation

**Tự động khấu trừ nợ qua lại:**

```
User A → "anh nợ B 500k"
  ├─ Check: B có nợ A không?
  │   └─ Yes: B nợ A 300k
  ├─ Calculate net: 500k - 300k = 200k
  ├─ Delete: B nợ A 300k
  └─ Create: A nợ B 200k

Result: Chỉ còn 1 khoản nợ net
```

**Implementation:** AI tự xử lý qua SQL queries.

---

## 🧪 Testing

### Local Development

```bash
npm run dev

# Open ngrok/cloudflared tunnel
cloudflared tunnel --url http://localhost:8787

# Set webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://your-tunnel.trycloudflare.com/webhook"
```

### Test Commands

```
Private chat:
  "mây ơi"                    → Bot responds
  "anh nợ Long 500k"          → Record debt
  "em nợ ai bao nhiêu?"       → Check debt

Group chat:
  @meismaybot "mây ơi"        → Bot responds
  Reply to bot message        → Bot responds
  Regular message             → Ignored (but saved)
```

### Monitoring

```sql
-- Check API key usage
SELECT 
  key_name,
  requests_per_minute, rpm_limit,
  requests_per_day, rpd_limit,
  is_blocked
FROM api_keys;

-- Check recent conversations
SELECT 
  sender,
  message_text,
  intent,
  created_at
FROM chat_messages
ORDER BY created_at DESC
LIMIT 20;

-- Check emotional state
SELECT * FROM bot_emotional_state
ORDER BY updated_at DESC
LIMIT 1;
```

---

## 📦 Deployment

### Cloudflare Workers

```bash
# 1. Build
npm run build

# 2. Configure wrangler.toml
[env.production]
vars = { }  # API keys in database, not env vars

# 3. Set secrets (in Cloudflare dashboard)
API_TELEGRAM = "..."
NEON_DATABASE_URL = "..."

# 4. Deploy
npm run deploy
```

### Environment Variables

**Required:**
- `API_TELEGRAM` - Telegram bot token
- `NEON_DATABASE_URL` - PostgreSQL connection string

**Optional:**
- `WEBHOOK_ADMIN_USER` - Webhook UI auth (default: admin)
- `WEBHOOK_ADMIN_PASSWORD` - Webhook UI auth (default: admin123)

**NOT NEEDED:**
- ~~`GEMINI_API_KEY`~~ → Now in database!

---

## 🐛 Troubleshooting

### Bot không respond

1. Check webhook:
```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

2. Check logs:
```bash
wrangler tail
```

3. Check database:
```sql
SELECT * FROM api_keys WHERE is_active = TRUE;
```

### 429 Rate Limit

- ✅ Auto-handled: Key rotation
- ✅ Check: Có đủ keys active không?
- ✅ Wait: Counters reset mỗi phút/ngày

### Database connection issues

```bash
# Test connection
psql $NEON_DATABASE_URL -c "SELECT 1"

# Check pool settings in Neon dashboard
```

---

## 📊 Performance

### Metrics

- **Response time:** ~2-5s (depending on AI iterations)
- **Database queries per request:** ~15-20
- **API calls per request:** 1-3 (depending on tool calls)
- **Build size:** 890kb

### Optimization Tips

1. ✅ Use `updateSingleKeyCache()` thay vì `refreshKeys()`
2. ✅ Cache userId/groupId in memory
3. ✅ Keep typing indicator alive (UX)
4. ✅ Non-blocking operations với `ctx.waitUntil()`

---

## 🔒 Security

- ✅ SQL injection protection (parameterized queries)
- ✅ Webhook admin authentication (Basic Auth)
- ✅ Database SSL connection required
- ✅ No API keys in environment (stored in DB)
- ⚠️ API keys table không expose cho AI (system-only)

---

## 📚 Tech Stack

- **Runtime:** Cloudflare Workers (V8 isolate)
- **Database:** Neon PostgreSQL (serverless)
- **ORM:** Drizzle ORM
- **AI:** Google Gemini Flash 2.0
- **Build:** Worktop
- **Language:** TypeScript

---

## 🤝 Contributing

1. Fork repo
2. Create feature branch
3. Make changes
4. Test locally
5. Submit PR

---

## 📄 License

MIT

---

## 🙋 FAQ

**Q: Tại sao dùng tools thay vì hardcode schema?**  
A: Schema-agnostic design giúp AI linh hoạt hơn. Có thể thêm tables/columns mà không cần update prompt.

**Q: API key rotation có chính xác không?**  
A: PostgreSQL triggers đảm bảo atomic operations. Counters reset tự động.

**Q: Bot có học từ conversation không?**  
A: Bot nhớ context (50 messages gần nhất) nhưng không học long-term. Mỗi request là stateless.

**Q: Có thể thêm tools mới không?**  
A: Yes! Add vào `src/tools/definitions.ts` và implement trong `executor.ts`.

**Q: Rate limit có vấn đề không?**  
A: Free tier: 5 RPM, 20 RPD per key. Thêm nhiều keys để scale.

---

**Last Updated:** January 5, 2026  
**Version:** 2.0 (Database-backed API keys)

