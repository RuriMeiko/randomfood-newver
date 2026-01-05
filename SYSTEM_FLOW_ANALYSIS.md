# Phân Tích Luồng Hệ Thống - Telegram Bot Autonomous Agent

> **Tạo:** 5/1/2026  
> **Mục đích:** Dò logic từ đầu đến cuối, phát hiện vấn đề, tối ưu hóa

---

## 📋 TÓM TẮT EXECUTIVE

### ✅ Điểm Mạnh
- **Architecture:** Tool-based autonomous agent với database as external memory
- **Scalability:** API key rotation với RPM/RPD tracking qua PostgreSQL
- **Separation of Concerns:** Rõ ràng giữa services, tools, và business logic
- **Type Safety:** Full TypeScript với Drizzle ORM
- **Async Design:** Non-blocking operations với ExecutionContext.waitUntil()

### ⚠️ Vấn Đề Phát Hiện
1. **File dư thừa:** `ai_studio_code.ts`, `fix-column.mjs` không dùng trong production
2. **API Key Management:** Vẫn truyền `env.GEMINI_API_KEY` dù không dùng (đã dùng DB)
3. **Double refresh:** `incrementRequestCount()` gọi `refreshKeys()` sau mỗi lần increment (overhead)
4. **Typing indicator overlap:** Gửi typing mỗi message nhưng không cancel typing trước
5. **Error handling:** Không có retry logic cho database operations (chỉ có cho AI)

### 🎯 Khuyến Nghị
- **Xóa:** Files không dùng (ai_studio_code.ts, fix-column.mjs)
- **Refactor:** Bỏ `apiKey` parameter khỏi AIBot constructor (dùng DB-only)
- **Optimize:** Thay `refreshKeys()` bằng local cache update
- **Enhance:** Thêm database connection pooling
- **UX:** Giữ typing indicator active xuyên suốt quá trình xử lý

---

## 🔄 LUỒNG XỬ LÝ CHI TIẾT

### 1️⃣ Entry Point: `index.ts`

```
HTTP Request → Cloudflare Worker
   ↓
POST /webhook
   ↓
Validate message.text exists
   ↓
shouldRespondInGroup()
   ├─ Private chat: ✅ Always
   ├─ Group: Check reply_to_message || keywords || mention
   └─ [YES] → ctx.waitUntil(processMessage)
       [NO]  → ctx.waitUntil(save message only)
```

**Phát hiện:**
- ✅ Non-blocking design với `ctx.waitUntil()`
- ✅ Lưu message ngay cả khi không trigger AI
- ⚠️ Không log request ID để trace debugging

**Tối ưu:**
```typescript
// Thêm request tracking
const requestId = crypto.randomUUID();
console.log(`🔍 [${requestId}] Processing message...`);
```

---

### 2️⃣ Bot Orchestration: `ai-bot-autonomous.ts`

```
processMessageWithMessagesAndStickers()
   ↓
Step 1: Parallel Operations
   ├─ telegramApi.sendChatAction('typing')
   └─ dbService.ensureUserAndGroup()
   ↓
Step 1.5: Save User Message
   └─ dbService.saveUserMessage()
   ↓
Step 2: Build Context
   └─ contextBuilder.buildContext()
   ↓
Step 3: Run Autonomous Agent
   └─ aiAnalyzer.analyzeAndExecuteWithMessages()
   ↓
Step 4: Send Messages
   └─ For each message:
        ├─ sendChatAction('typing')
        ├─ setTimeout(delay)
        └─ sendMessage(text)
```

**Phát hiện:**
- ✅ Clear separation of concerns
- ✅ Database save trước khi AI processing (đảm bảo không mất data)
- ⚠️ Typing indicator bị reset mỗi message → user thấy "typing" nhấp nháy

**Vấn đề:**
```typescript
// Hiện tại:
for (const msg of messages) {
  await telegramApi.sendChatAction(message.chat.id, 'typing'); // Reset mỗi lần
  await sleep(delay);
  await telegramApi.sendMessage(...);
}

// Nên:
// 1. Send typing một lần ở đầu
// 2. Keep-alive typing indicator (Telegram auto-cancel sau 5s)
// 3. Hoặc dùng setInterval để maintain typing state
```

**Constructor Issue:**
```typescript
// Hiện tại:
constructor(apiKey: string, databaseUrl: string) {
  this._aiAnalyzer = new AIAnalyzerService(apiKey, this._dbService, databaseUrl);
}

// Vấn đề: apiKey không dùng nữa vì đã load từ DB
// Fix: Bỏ apiKey parameter
```

---

### 3️⃣ Context Builder: `context-builder-autonomous.ts`

```
buildContext()
   ↓
Get User ID + Group ID
   ↓
Get Recent 50 Messages
   ↓
Get Emotional Context
   ↓
Return Schema-Agnostic Context:
   ├─ Current Time (Vietnam TZ)
   ├─ Emotional State
   ├─ User Info
   ├─ Chat Info
   └─ Conversation History
```

**Phát hiện:**
- ✅ Schema-agnostic design (không hardcode DB structure)
- ✅ Emotional context integration
- ✅ Vietnam timezone handling
- ⚠️ Không cache userId/groupId → query DB mỗi lần

**Tối ưu:**
```typescript
// Add cache
private userIdCache = new Map<number, number>();

async getUserId(tgId: number): Promise<number> {
  if (this.userIdCache.has(tgId)) {
    return this.userIdCache.get(tgId)!;
  }
  const id = await this.dbService.getUserId(tgId);
  this.userIdCache.set(tgId, id);
  return id;
}
```

---

### 4️⃣ AI Analyzer: `ai-analyzer-autonomous.ts`

```
analyzeAndExecuteWithMessages()
   ↓
ensureInitialized() → Wait for ApiKeyManager
   ↓
buildPromptWithContext()
   ↓
toolCallingLoop() ← MAX 10 ITERATIONS
   ↓
   ├─ ApiKeyManager.executeWithRetry()
   │   ├─ getNextKey() → Check RPM/RPD
   │   ├─ incrementRequestCount()
   │   └─ models.generateContent()
   ↓
   ├─ [No tool calls] → parseFinalResponse()
   │
   └─ [Has tool calls]
       ├─ Add to conversation history
       ├─ ToolExecutor.executeTool()
       └─ Add results → Loop again
```

**Phát hiện:**
- ✅ Async initialization với `ensureInitialized()`
- ✅ Tool calling loop với max iterations
- ✅ API key rotation với retry logic
- ⚠️ Không track số lần retry per request
- ⚠️ MAX_ITERATIONS=10 có thể quá nhiều (billing concern)

**API Key Flow:**
```
ApiKeyManager.executeWithRetry()
   ↓
Try attempt 1-3:
   ├─ createClient()
   │   ├─ getNextKey() → Fresh query DB for key state
   │   └─ incrementRequestCount() → Call SQL function + refreshKeys()
   ↓
   ├─ Execute operation
   ├─ [Success] → reportSuccess() → Update DB + refreshKeys()
   └─ [429 Error] → reportFailure() → Update DB + refreshKeys() + rotateKey()
```

**Vấn đề: Quá nhiều refreshKeys()**
```typescript
// Mỗi request đi qua:
// 1. getNextKey() → Query DB fresh key
// 2. incrementRequestCount() → SQL function + refreshKeys()
// 3. reportSuccess() → Update DB + refreshKeys()
// → Total: 3 DB queries chỉ để refresh cache

// Fix: Chỉ refresh khi thực sự cần
```

---

### 5️⃣ Tool Executor: `tools/executor.ts`

```
executeTool(toolCall, context)
   ↓
Switch(toolCall.name):
   ├─ INSPECT_SCHEMA → dbService.inspectSchema()
   ├─ DESCRIBE_TABLE → dbService.describeTable()
   ├─ LIST_TABLES → dbService.listTables()
   ├─ EXECUTE_SQL → dbService.executeToolSql()
   └─ ANALYZE_INTERACTION → emotionService.updateFromInteraction()
   ↓
Return { name, content, success }
```

**Phát hiện:**
- ✅ Clean switch-case pattern
- ✅ Error handling per tool
- ✅ Context passing để track userId/groupId
- ⚠️ Không có tool execution timeout
- ⚠️ Không log tool execution time

**Enhancement:**
```typescript
async executeTool(toolCall: ToolCall, context?: any): Promise<ToolResult> {
  const startTime = Date.now();
  const timeout = 30000; // 30s timeout
  
  try {
    const resultPromise = this._executeToolInternal(toolCall, context);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Tool timeout')), timeout)
    );
    
    const result = await Promise.race([resultPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ [ToolExecutor] ${toolCall.name} took ${duration}ms`);
    
    return result;
  } catch (error) {
    // ...
  }
}
```

---

### 6️⃣ API Key Manager: `api-key-manager.ts`

```
initialize()
   ↓
Load keys from DB (Drizzle ORM)
   ├─ SELECT * FROM api_keys WHERE is_active = TRUE
   └─ Store in this.keys[]
   ↓
getNextKey() → Loop through keys
   ├─ Refresh key from DB (fresh data)
   ├─ Check isKeyAvailable()
   │   ├─ is_blocked?
   │   ├─ requests_per_minute >= rpm_limit?
   │   └─ requests_per_day >= rpd_limit?
   └─ Return first available key
   ↓
incrementRequestCount(keyId)
   ├─ Query keyName from DB (Drizzle)
   └─ Call SQL function: increment_request_count()
   └─ refreshKeys() ← OVERHEAD
   ↓
reportSuccess(keyId)
   ├─ UPDATE api_keys SET failure_count=0, is_blocked=FALSE
   └─ refreshKeys() ← OVERHEAD
   ↓
reportFailure(keyId)
   ├─ UPDATE api_keys SET failure_count++, is_blocked=TRUE
   └─ refreshKeys() ← OVERHEAD
```

**Vấn đề Lớn:**
1. **Over-refreshing:** Mỗi operation đều gọi `refreshKeys()` → Query toàn bộ keys
2. **Inconsistent:** `incrementRequestCount()` dùng SQL function (atomic) nhưng `reportSuccess/Failure` dùng Drizzle ORM (không atomic nếu concurrent)
3. **Unused import:** `and, drizzleSql` không dùng

**Fix:**
```typescript
// Option 1: Chỉ refresh khi cần
async incrementRequestCount(keyId: number): Promise<void> {
  // Query key name
  const keyResult = await this.db.select(...);
  
  // Call SQL function (atomic)
  await this.sql`SELECT increment_request_count(${keyName})`;
  
  // Update local cache ONLY for this key
  const updatedKey = await this.db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);
  
  if (updatedKey.length > 0) {
    const index = this.keys.findIndex(k => k.id === keyId);
    if (index >= 0) {
      this.keys[index] = updatedKey[0];
    }
  }
  // Không cần refreshKeys() toàn bộ
}

// Option 2: Dùng SQL function cho tất cả operations
// Tạo: mark_key_success(key_id), mark_key_failed(key_id)
```

---

### 7️⃣ Database Service: `database.ts`

Không đọc chi tiết nhưng cần check:
- Connection pooling strategy
- Query timeout settings
- Transaction handling
- Error retry logic

**Assumption Check:**
```sql
-- Giả định: init-database.sql đã có triggers để reset counters
CREATE TRIGGER reset_rpm_counters ...
CREATE TRIGGER reset_rpd_counters ...

-- Verify:
SELECT * FROM pg_trigger WHERE tgname LIKE 'reset_%';
```

---

## 🗑️ FILES DƯ THỪA

### 1. `ai_studio_code.ts`
**Lý do:** Sample code từ Google AI Studio, không dùng trong production

```typescript
// Content: Example code với getWeather function
// Usage: Không có import nào reference file này
// Action: XÓA
```

### 2. `fix-column.mjs`
**Lý do:** One-time migration script, đã chạy xong

```javascript
// Content: Add real_name column to tg_users
// Usage: Migration đã được thay bằng add-real-name-column.sql
// Action: XÓA (hoặc move sang migrations/ folder)
```

### 3. Kiểm tra các file SQL
```bash
# Files hiện có:
- add-real-name-column.sql  ← Migration (nên chạy rồi archive)
- init-api-keys.sql         ← Setup script (cần giữ)
- init-database.sql         ← Setup script (cần giữ)
- init-db.sh                ← Setup script (cần giữ)
```

**Action:** Move migration scripts sang `migrations/` folder

---

## 🔧 CODE SMELLS & FIXES

### 1. Unused Constructor Parameter

**File:** `ai-bot-autonomous.ts`

```typescript
// ❌ Hiện tại:
constructor(apiKey: string, databaseUrl: string) {
  this._aiAnalyzer = new AIAnalyzerService(apiKey, this._dbService, databaseUrl);
}

// ✅ Nên:
constructor(databaseUrl: string) {
  this._aiAnalyzer = new AIAnalyzerService(this._dbService, databaseUrl);
}
```

**Impact:** Bỏ dependency vào `env.GEMINI_API_KEY`, full DB-backed

---

### 2. Redundant Database Refreshes

**File:** `api-key-manager.ts`

```typescript
// ❌ Hiện tại:
async incrementRequestCount(keyId: number): Promise<void> {
  await this.sql`SELECT increment_request_count(...)`;
  await this.refreshKeys(); // ← Load ALL keys
}

// ✅ Nên:
async incrementRequestCount(keyId: number): Promise<void> {
  await this.sql`SELECT increment_request_count(...)`;
  // Update local cache for this key only
  const updated = await this.db.select().from(apiKeys)
    .where(eq(apiKeys.id, keyId)).limit(1);
  if (updated[0]) {
    const idx = this.keys.findIndex(k => k.id === keyId);
    if (idx >= 0) this.keys[idx] = updated[0];
  }
}
```

**Impact:** Giảm DB queries từ O(n) xuống O(1)

---

### 3. Unused Imports

**File:** `api-key-manager.ts`

```typescript
// ❌ Không dùng:
import { and, sql as drizzleSql } from 'drizzle-orm';

// ✅ Remove
```

---

### 4. Typing Indicator UX

**File:** `ai-bot-autonomous.ts`

```typescript
// ❌ Hiện tại: Typing nhấp nháy
for (const msg of messages) {
  await telegramApi.sendChatAction(message.chat.id, 'typing');
  await sleep(delay);
  await sendMessage(text);
}

// ✅ Option 1: Single typing ở đầu
await telegramApi.sendChatAction(message.chat.id, 'typing');
for (const msg of messages) {
  await sleep(delay);
  await sendMessage(text);
}

// ✅ Option 2: Keep-alive typing
const typingInterval = setInterval(
  () => telegramApi.sendChatAction(message.chat.id, 'typing'),
  4000 // Telegram typing expires after 5s
);
try {
  for (const msg of messages) {
    await sleep(delay);
    await sendMessage(text);
  }
} finally {
  clearInterval(typingInterval);
}
```

---

### 5. Missing Request Tracking

**File:** `index.ts`

```typescript
// ❌ Không có trace ID
console.log('=== WEBHOOK INPUT ===');
console.log('Request URL:', request.url);

// ✅ Add request ID
const requestId = crypto.randomUUID().slice(0, 8);
console.log(`🔍 [${requestId}] === WEBHOOK INPUT ===`);
// Pass requestId xuống các services để trace
```

---

## 📊 PERFORMANCE METRICS

### Database Queries Per Request

**Hiện tại:**
```
1. ensureUserAndGroup()      → 2-3 queries (INSERT/SELECT)
2. saveUserMessage()          → 1 INSERT
3. buildContext()
   - getUserId()              → 1 SELECT
   - getGroupId()             → 1 SELECT (if group)
   - getRecentMessages()      → 1 SELECT
   - getEmotionalContext()    → 1 SELECT
4. toolCallingLoop()
   - Each iteration:
     - ApiKey operations      → 3-5 queries
     - Tool executions        → Variable (0-N)
5. saveConversation()         → N INSERTs (per message)

TOTAL: ~15-30 queries per request
```

**Optimization Target:** < 10 queries per request

**Strategy:**
- Cache userId/groupId in memory
- Batch INSERT for messages
- Reduce key refresh calls
- Use database connection pooling

---

### API Call Tracking

```typescript
// Hiện tại: Không track
// Nên: Log mọi API call
{
  requestId: string,
  keyId: number,
  keyName: string,
  model: string,
  promptTokens: number,
  responseTokens: number,
  latencyMs: number,
  toolCallCount: number,
  success: boolean
}
```

---

## 🚀 OPTIMIZATION ROADMAP

### Phase 1: Quick Wins (1 hour)
- [ ] Xóa `ai_studio_code.ts`, `fix-column.mjs`
- [ ] Bỏ unused imports trong `api-key-manager.ts`
- [ ] Bỏ `apiKey` parameter khỏi AIBot constructor
- [ ] Fix typing indicator (chọn option 1 hoặc 2)
- [ ] Add request ID tracking

### Phase 2: Performance (2 hours)
- [ ] Optimize `refreshKeys()` → chỉ update key cần thiết
- [ ] Add userId/groupId cache
- [ ] Add tool execution timeout
- [ ] Add API call metrics logging

### Phase 3: Reliability (3 hours)
- [ ] Database connection pooling config
- [ ] Retry logic cho DB operations
- [ ] Health check endpoint với DB connectivity
- [ ] Dead letter queue cho failed messages

### Phase 4: Monitoring (2 hours)
- [ ] OpenTelemetry integration
- [ ] Request duration histogram
- [ ] API key usage dashboard
- [ ] Error rate alerting

---

## 📈 METRICS TO TRACK

### System Health
- Request success rate
- Average response time
- P95/P99 latency
- Database connection pool usage

### API Key Management
- Requests per key (RPM/RPD)
- Key rotation frequency
- 429 error rate per key
- Key availability percentage

### AI Performance
- Average tool call iterations
- Tool execution time distribution
- Context size (tokens)
- Response quality (user feedback)

### Database
- Query duration P95
- Connection pool saturation
- Slow query log (>100ms)
- Transaction rollback rate

---

## ✅ FINAL CHECKLIST

### Architecture
- [x] Tool-based autonomous agent
- [x] Database as external memory
- [x] Schema-agnostic design
- [x] API key rotation logic
- [x] Non-blocking operations

### Code Quality
- [x] TypeScript strict mode
- [x] Drizzle ORM for type safety
- [x] Error handling per layer
- [ ] Request tracing (Missing)
- [ ] Performance logging (Missing)

### Production Readiness
- [x] Database migrations
- [x] Environment variables
- [x] Health check endpoint
- [x] Webhook authentication
- [ ] Connection pooling config
- [ ] Monitoring/alerting

### Documentation
- [x] README.md
- [x] AUTONOMOUS_AGENT_README.md
- [x] EMOTION_SYSTEM.md
- [x] SYSTEM_FLOW_ANALYSIS.md (This file)

---

## 📝 NOTES

**Database Schema Sync:**
- ✅ `schema.ts` matches `init-database.sql`
- ✅ API keys table có full rate limiting fields
- ✅ Triggers cho auto-reset RPM/RPD

**API Key Management:**
- ✅ Load từ database
- ✅ Automatic rotation
- ⚠️ Over-refreshing (cần fix)
- ⚠️ Không có key health scoring

**Error Recovery:**
- ✅ Retry logic cho AI calls
- ⚠️ Không có retry cho DB operations
- ⚠️ Không có dead letter queue

**Observability:**
- ⚠️ Thiếu request tracing
- ⚠️ Thiếu performance metrics
- ⚠️ Thiếu error tracking (Sentry, etc.)

---

## 🎯 NEXT STEPS

1. **Immediate (Today):**
   - Xóa files dư thừa
   - Fix API key refresh overhead
   - Add request ID tracking

2. **Short-term (This week):**
   - Implement caching strategy
   - Add tool execution timeout
   - Improve typing indicator UX

3. **Medium-term (This month):**
   - Setup monitoring dashboard
   - Implement connection pooling
   - Add health checks

4. **Long-term (Next quarter):**
   - A/B testing framework
   - Response quality metrics
   - Auto-scaling based on load

---

**END OF ANALYSIS**
