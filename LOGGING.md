# Logging System Documentation

## 📋 Log Levels

Bot sử dụng emoji prefixes để dễ đọc logs:

- `🤖` - Bot orchestration
- `🔍` - AI Analyzer  
- `🔧` - Tool Executor
- `🔑` - API Key Manager
- `💾` - Database operations
- `📤` / `📥` - Network requests
- `✅` - Success
- `❌` - Errors
- `⚠️` - Warnings
- `⏭️` - Skipped

---

## 📊 Log Examples

### 1. Webhook Request

```
=== WEBHOOK INPUT ===
Request URL: https://worker.dev/webhook
Request Body: {
  "message": {
    "from": { "id": 123, "first_name": "User" },
    "chat": { "id": -456, "type": "group" },
    "text": "mây ơi, anh nợ Long 500k"
  }
}

=== PROCESSING MESSAGE ===
From: User (ID: 123)
Chat: group (ID: -456)
Text: mây ơi, anh nợ Long 500k
✅ Message processing started (non-blocking)
```

---

### 2. Bot Orchestration

```
🤖 [AIBotAutonomous] Processing message: mây ơi, anh nợ Long 500k
⌨️ [AIBotAutonomous] Step 1: Starting parallel operations...
💾 [AIBotAutonomous] Step 1.5: Saving user message to DB...
✅ [AIBotAutonomous] User message saved
🧠 [AIBotAutonomous] Step 2: Building context (schema-agnostic)...
📄 [AIBotAutonomous] Context built
🎯 [AIBotAutonomous] Step 3: Running autonomous agent...
```

---

### 3. AI Agent Tool Loop

```
🔍 [AIAnalyzer] Tool loop iteration 1/10

=== AI RESPONSE ===
Role: model
Parts: [
  {
    "functionCall": {
      "name": "describe_table",
      "args": { "table_name": "debts" }
    }
  }
]

🔧 [AIAnalyzer] === TOOL CALL: describe_table ===
📥 Arguments: {
  "table_name": "debts"
}
```

---

### 4. Tool Execution

```
🔧 [ToolExecutor] ========================================
🔧 [ToolExecutor] Executing tool: describe_table
🔧 [ToolExecutor] Args: {
  "table_name": "debts"
}
🔧 [ToolExecutor] Context: {
  "userId": 5,
  "groupId": 2,
  "userMessage": "mây ơi, anh nợ Long 500k"
}

✅ [ToolExecutor] Tool executed successfully in 45ms
📊 [ToolExecutor] Result size: 523 chars
📄 [ToolExecutor] Full result: {
  "columns": [
    { "name": "id", "type": "integer" },
    { "name": "creditor_id", "type": "integer" },
    { "name": "debtor_id", "type": "integer" },
    { "name": "amount", "type": "numeric" },
    { "name": "description", "type": "text" }
  ]
}
🔧 [ToolExecutor] ========================================
```

---

### 5. Tool Result Return to AI

```
📤 Result: ✅ Success
📄 Content length: 523 chars
📄 Full content: {"columns":[...]}

✅ [AIAnalyzer] Tool results added to conversation
📊 Conversation history length: 3 messages
================================================================================
```

---

### 6. Next Tool Call

```
🔍 [AIAnalyzer] Tool loop iteration 2/10

=== AI RESPONSE ===
Role: model
Parts: [
  {
    "functionCall": {
      "name": "execute_sql",
      "args": {
        "query": "SELECT * FROM tg_users WHERE first_name = $1",
        "params": ["Long"],
        "reason": "Find user ID for Long"
      }
    }
  }
]

🔧 [AIAnalyzer] === TOOL CALL: execute_sql ===
📥 Arguments: {
  "query": "SELECT * FROM tg_users WHERE first_name = $1",
  "params": ["Long"],
  "reason": "Find user ID for Long"
}

🔧 [ToolExecutor] ========================================
🔧 [ToolExecutor] Executing tool: execute_sql
🔧 [ToolExecutor] Args: {
  "query": "SELECT * FROM tg_users WHERE first_name = $1",
  "params": ["Long"],
  "reason": "Find user ID for Long"
}
🔧 [ToolExecutor] Context: {
  "userId": 5,
  "groupId": 2,
  "userMessage": "mây ơi, anh nợ Long 500k"
}

✅ [ToolExecutor] Tool executed successfully in 78ms
📊 [ToolExecutor] Result size: 156 chars
📄 [ToolExecutor] Result preview: [{"id":8,"telegram_id":987654,"first_name":"Long","last_name":"Nguyen","username":"longng"}]
🔧 [ToolExecutor] ========================================
```

---

### 7. Final Response

```
🔍 [AIAnalyzer] Tool loop iteration 3/10

=== AI RESPONSE ===
Role: model
Parts: [
  { "text": "{\\"messages\\":[{\\"text\\":\\"Oke anh!\\",\\"delay\\":\\"800\\"},{\\"text\\":\\"Em đã ghi là anh nợ Long 500k rồi nha 💰\\",\\"delay\\":\\"1200\\"}],\\"intent\\":\\"record_debt\\"}" }
]

✅ [AIAnalyzer] Final response received (no more tool calls)

📄 [AIAnalyzer] Final text response:
{
  "messages": [
    { "text": "Oke anh!", "delay": "800" },
    { "text": "Em đã ghi là anh nợ Long 500k rồi nha 💰", "delay": "1200" }
  ],
  "intent": "record_debt"
}

🔍 [AIAnalyzer] Agent response: {
  "intent": "record_debt",
  "messageCount": 2
}
```

---

### 8. Sending Messages

```
📤 [AIBotAutonomous] Step 4: Sending messages to Telegram...
✅ [AIBotAutonomous] Sent message: Oke anh!
✅ [AIBotAutonomous] Sent message: Em đã ghi là anh nợ Long 500k rồi nha 💰
✅ [AIBotAutonomous] Message processing complete
```

---

### 9. API Key Management Logs

```
🔑 [ApiKeyManager] Initializing with database backend
🔑 [ApiKeyManager] Loaded 2 API key(s) from database
🔑 [ApiKeyManager] Using key: primary (RPM: 3/5, RPD: 15/20)
```

**On Rate Limit:**
```
⚠️ [ApiKeyManager] Rate limit hit (attempt 1/3)
⚠️ [ApiKeyManager] Key primary marked as failed (429: true)
🔄 [ApiKeyManager] Rotated key: 0 → 1
🔑 [ApiKeyManager] Using key: backup (RPM: 0/5, RPD: 8/20)
✅ [ApiKeyManager] Key backup marked as successful
```

---

## 🔍 Reading Logs

### What AI Can See (Context)

Logs show what's provided in context:

```
=== CURRENT TIME ===
05/01/2026, 17:30:45 (Asia/Ho_Chi_Minh - GMT+7)

=== EMOTIONAL STATE ===
happiness: 0.65, energy: 0.70, stress: 0.30

=== CURRENT USER ===
Name: User Name
Telegram ID: 123456789
Database ID: 5
Username: @username

=== RECENT CONVERSATION (50 messages) ===
[01/05 17:25] User: mây ơi
[01/05 17:25] AI: Dạ, anh gọi em à? 🥰
[01/05 17:30] User: anh nợ Long 500k
```

### What AI Discovers (Tools)

```
🔧 Tool: inspect_schema
📤 Returns: { tables: ["debts", "tg_users", ...] }

🔧 Tool: describe_table (debts)
📤 Returns: { columns: [...], constraints: [...] }

🔧 Tool: execute_sql
📤 Returns: [{ id: 1, creditor_id: 5, debtor_id: 8, amount: 500000 }]
```

---

## 📊 Complete Flow Example

```
=== WEBHOOK INPUT ===
[User message received]

🤖 Step 1: Parallel ops
⌨️ Typing indicator sent
💾 User ensured in DB

💾 Step 1.5: Message saved

🧠 Step 2: Context built
├─ Current time: Vietnam TZ
├─ Emotional state loaded
├─ User info: ID 5
└─ Recent 50 messages

🎯 Step 3: AI Agent
  🔍 Iteration 1:
    🔧 describe_table(debts)
    📤 Returns columns info
  
  🔍 Iteration 2:
    🔧 execute_sql(find user)
    📤 Returns user ID 8
  
  🔍 Iteration 3:
    🔧 execute_sql(insert debt)
    📤 Returns success
  
  🔍 Iteration 4:
    📄 Final response JSON

📤 Step 4: Send to Telegram
├─ Message 1: "Oke anh!"
└─ Message 2: "Em đã ghi..."

✅ Complete
```

---

## 🛠️ Debugging Tips

### Enable Verbose Logs

Logs are already verbose. To filter:

```bash
# Only tool calls
wrangler tail | grep "🔧"

# Only AI responses
wrangler tail | grep "=== AI RESPONSE ==="

# Only errors
wrangler tail | grep "❌"

# API key issues
wrangler tail | grep "🔑"
```

### Check Tool Execution Time

```bash
wrangler tail | grep "Tool executed successfully"
# Shows: "in XXms"
```

### Monitor API Key Rotation

```bash
wrangler tail | grep "🔑\|🔄"
```

---

## 📝 Log to Database

Tools calls are logged to `chat_messages`:

```sql
SELECT 
  intent,
  sql_query,
  sql_params,
  created_at
FROM chat_messages
WHERE sender = 'ai'
ORDER BY created_at DESC
LIMIT 10;
```

This shows what SQL queries AI executed.

---

**Note:** Logs are detailed để dễ debug. Production có thể giảm log level.
