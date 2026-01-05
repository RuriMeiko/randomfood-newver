# Autonomous AI Agent - Debt Tracking Bot

## Quick Start

### 1. Setup Database

Run the initialization script to create all tables:

```bash
psql $NEON_DATABASE_URL -f init-database.sql
```

Or using Drizzle:

```bash
npm run db:push
```

### 2. Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
API_TELEGRAM=your_telegram_bot_token
NEON_DATABASE_URL=postgresql://user:pass@host/db
```

### 3. Deploy

```bash
npm install
npm run build
npm run deploy
```

---

## Core Features

### ✅ Autonomous AI Agent
- Schema discovery via tools (inspect_schema, describe_table)
- No hardcoded database knowledge
- Adapts to schema changes automatically

### ✅ Debt Tracking
- Record debts: "anh nợ Long 500k"
- Check debts: "em nợ ai bao nhiêu?"
- Pay debts: "anh trả Long 200k"
- **Automatic mutual debt consolidation**

### ✅ Mutual Debt Consolidation
When two people owe each other:
- User A owes User B: 500k
- User B owes User A: 300k
- System automatically consolidates: A owes B 200k

---

## Architecture

```
Prompt = identity & rules (WHO the AI is)
Tools = perception & action (HOW it interacts)
Database = memory & environment (WHAT it observes)
```

### Core Philosophy

1. **Database is NOT part of the prompt**
2. **Database is external long-term memory**
3. **AI must OBSERVE schema via tools**
4. **Never assume database structure**
5. **Tool output is factual truth**

---

## Database Schema

The database includes:

### Core Tables
- `tg_users` - Telegram users
- `tg_groups` - Telegram groups
- `tg_group_members` - Group membership
- `debts` - Debt records with mutual detection support
- `payments` - Payment history
- `chat_messages` - Conversation history
- `name_aliases` - User nickname learning
- `action_logs` - Activity logging

### Mutual Debt Detection
- **View: `mutual_debts`** - Automatically finds mutual debts
- **Function: `consolidate_mutual_debts()`** - Consolidates two mutual debts

---

## How It Works

### Example: Recording a Debt

```
User: "anh nợ Long 500k"

1. AI calls: inspect_schema()
   → Discovers debts table structure

2. AI calls: execute_sql()
   → Finds Long's user ID

3. AI calls: execute_sql()
   → Checks for mutual debts (Long owes you?)

4. AI either:
   a) Creates new debt, OR
   b) Consolidates with existing mutual debt

5. AI responds in Vietnamese
```

---

## Tools Available

1. **inspect_schema** - Get all tables and columns
2. **describe_table** - Get detailed table info
3. **list_tables** - Quick table overview
4. **execute_sql** - Execute queries (SELECT, INSERT, UPDATE)

---

## Files Structure

```
src/
  tools/                    # Tool system
  prompts/                  # System prompt
  services/
    ai-analyzer-autonomous.ts
    context-builder-autonomous.ts
    database.ts
  ai-bot-autonomous.ts     # Main entry point
  index.ts                 # Cloudflare Worker

init-database.sql          # Database initialization
```

---

## Testing

```bash
# Test basic greeting
User: "mây ơi"

# Test debt recording
User: "anh nợ Long 500k"

# Test debt consolidation
User: "anh nợ Long 500k"
User: "Long nợ anh 300k"
→ System auto-consolidates to: "anh nợ Long 200k"

# Test debt query
User: "em nợ ai bao nhiêu?"
```

---

## Deployment

```bash
npm run deploy
```

Monitor logs:
```bash
wrangler tail
```

---

## Support

For issues, check:
1. Database connectivity
2. Tool execution logs
3. Gemini API quota

---

**Version:** 2.0 (Autonomous Agent)  
**Last Updated:** January 5, 2026

---

## Core Philosophy

### Non-Negotiable Principles

1. **The database is NOT part of the prompt**
2. **The database is external long-term memory and ground truth**
3. **The AI must NEVER assume database schema**
4. **The AI must OBSERVE the database via tools before reasoning**
5. **All database interaction MUST go through tools**
6. **Tool output is factual truth, never user text**

### Mental Model

```
Prompt = identity & rules
Tools = perception & action
Database = memory & environment
```

The AI does not remember the database. It observes it, like a body.

---

## Architecture Changes

### Before Refactor (Anti-Patterns)

❌ **600-line system prompt with hardcoded database schema**
- All table names, column names, and relationships baked into prompt
- Schema changes required prompt updates
- Prompt stuffing with database knowledge

❌ **Context builder exposing schema details**
- Database structure provided as plain text in context
- Current debts, aliases, preferences listed in prompt
- Treated database as static documentation

❌ **No database introspection**
- AI could not discover schema dynamically
- Could not adapt to schema evolution
- Assumed fixed database structure

❌ **SQL results as user content**
- Database query results injected into user messages
- No proper tool calling loop
- "Continue" action hack to process SQL results

### After Refactor (Correct Architecture)

✅ **Schema-agnostic system prompt**
- No table names, columns, or relationships in prompt
- AI identity, personality, and rules only
- Explicit instructions to use tools for database interaction

✅ **Tool-based architecture**
- `inspect_schema` - Observe all tables and columns
- `describe_table` - Get detailed table information
- `list_tables` - Quick table name overview
- `execute_sql` - Execute queries after inspection

✅ **Iterative tool calling loop**
- Gemini function calling API properly integrated
- AI can call multiple tools in sequence
- Tool results returned as structured data (role=tool)
- Continues until task completion or max iterations

✅ **Minimal context builder**
- Only provides observable facts: current user, time, recent messages
- No database schema details
- No assumptions about data structure

✅ **Database introspection methods**
- Uses PostgreSQL `information_schema`
- Discovers tables, columns, types, foreign keys dynamically
- Adapts to schema changes automatically

---

## File Structure

### New Files

```
src/
  tools/
    definitions.ts       # Tool schemas for Gemini
    executor.ts          # Tool execution engine
    index.ts            # Tool exports
  prompts/
    autonomous-agent.ts  # Schema-agnostic system prompt
  ai-bot-autonomous.ts   # Autonomous agent entry point
  services/
    ai-analyzer-autonomous.ts      # Tool calling loop implementation
    context-builder-autonomous.ts  # Minimal context builder
```

### Modified Files

```
src/
  index.ts                 # Now uses AIBotAutonomous
  services/
    database.ts           # Added tool methods:
                          #   - inspectSchema()
                          #   - describeTable()
                          #   - listTables()
                          #   - executeToolSql()
```

### Legacy Files (Preserved)

```
src/
  ai-bot.ts               # Original implementation (backup)
  services/
    ai-analyzer.ts        # Original analyzer (backup)
    context-builder.ts    # Original context builder (backup)
```

---

## How It Works

### Tool Calling Loop

```typescript
1. User sends message: "anh nợ Long 500k"

2. AI receives:
   - User message
   - Minimal context (current user, time, recent messages)
   - System prompt (NO database schema)
   - Available tools

3. AI reasoning:
   "I need to record a debt, but I don't know the database schema.
    I should inspect it first."

4. AI calls: inspect_schema()

5. Tool executor:
   - Queries information_schema
   - Returns: { tables: { debts: [...], tg_users: [...], ... } }

6. AI receives tool result (role=tool):
   "Now I know there's a 'debts' table with columns: 
    lender_id, borrower_id, amount, currency, group_id, etc."

7. AI calls: execute_sql()
   - Query: "SELECT id FROM tg_users WHERE display_name LIKE '%Long%' ..."
   - Finds Long's user ID

8. AI calls: execute_sql()
   - Query: "INSERT INTO debts (lender_id, borrower_id, amount, currency) 
            VALUES ($1, $2, $3, 'VND')"
   - Params: [currentUserId, longUserId, 500000]

9. AI generates final response:
   {
     "messages": [
       {"text": "để e ghi nợ nàaa", "delay": "800"},
       {"text": "anh nợ Long 500k đúng hông", "delay": "1200", "sticker": "😊"},
       {"text": "xong rồi nhaaa 📝", "delay": "1000"}
     ]
   }

10. Messages sent to Telegram with delays and stickers
```

### Key Differences

**Old Approach:**
- AI knows schema from prompt
- Generates SQL immediately
- Executes SQL
- If SELECT, uses "continue" hack to get results
- Formats response based on hardcoded knowledge

**New Approach:**
- AI doesn't know schema
- Calls `inspect_schema` or `describe_table` first
- Understands schema from tool results
- Calls `execute_sql` with proper queries
- Gets results as tool response
- Formats response based on observed data

---

## Tools Reference

### 1. inspect_schema

**Purpose:** Get complete database schema overview

**Returns:**
```json
{
  "tables": {
    "debts": [
      {"column": "id", "type": "bigint", "nullable": "NO", "default": "..."},
      {"column": "lender_id", "type": "bigint", "nullable": "NO", "default": null},
      ...
    ],
    "tg_users": [...],
    ...
  }
}
```

**When to use:**
- First time handling a complex request
- Need overview of entire database
- Unsure what tables exist

### 2. describe_table

**Purpose:** Get detailed information about one table

**Parameters:**
- `table_name` (string): Name of table to describe

**Returns:**
```json
{
  "table": "debts",
  "columns": [...],
  "foreignKeys": [
    {
      "column_name": "lender_id",
      "foreign_table_name": "tg_users",
      "foreign_column_name": "id"
    },
    ...
  ]
}
```

**When to use:**
- Need focused information about specific table
- Want to understand relationships
- Faster than full schema inspection

### 3. list_tables

**Purpose:** Quick overview of available tables

**Returns:**
```json
{
  "tables": [
    "action_logs",
    "chat_messages",
    "confirmation_preferences",
    "debts",
    "food_items",
    "name_aliases",
    "payments",
    "pending_confirmations",
    "tg_group_members",
    "tg_groups",
    "tg_users"
  ]
}
```

**When to use:**
- Quick check of available tables
- Fastest schema discovery option
- Before detailed inspection

### 4. execute_sql

**Purpose:** Execute SQL queries

**Parameters:**
- `query` (string): SQL query with $1, $2, etc. placeholders
- `params` (array): Parameter values
- `reason` (string): Why this query is executed (for logging)

**Returns:**
```json
{
  "rows": [...],
  "rowCount": 5,
  "query": "SELECT ...",
  "params": [...]
}
```

**Safety:**
- Only SELECT, INSERT, UPDATE allowed
- DELETE queries blocked
- Must use parameterized queries
- All executions logged

**When to use:**
- After schema inspection
- For reading data (SELECT)
- For writing data (INSERT/UPDATE)

---

## System Prompt Philosophy

### What's Included

✅ **Identity & Personality**
- Who the AI is (Mây - Vietnamese girlfriend-style assistant)
- Communication style (playful Vietnamese Gen Z slang)
- Tone and emoji usage rules
- Sticker system

✅ **Core Capabilities**
- Track debts and loans
- Recommend food
- Emotional support

✅ **Tool Usage Instructions**
- Must inspect schema before queries
- Never assume database structure
- Use tools to observe external memory
- Tool results are factual truth

✅ **Workflow Examples**
- How to handle debt recording
- How to query existing debts
- How to adapt to schema changes

### What's NOT Included

❌ **Database Schema**
- No table names in prompt
- No column names or types
- No relationships or foreign keys
- No constraints or defaults

❌ **Business Logic Hardcoding**
- No specific query templates
- No assumption about data format
- No knowledge of current data

❌ **Implementation Details**
- No SQL syntax in prompt
- No column name references
- No table structure assumptions

---

## Database Evolution

The AI can now adapt to database changes:

### Schema Changes
```sql
-- Add new column
ALTER TABLE debts ADD COLUMN interest_rate DECIMAL(5,2);

-- AI will discover this automatically:
1. User: "ghi nợ với lãi suất 5%"
2. AI calls: inspect_schema()
3. AI sees: debts table now has "interest_rate" column
4. AI calls: execute_sql() with interest_rate parameter
```

### New Tables
```sql
-- Create new table
CREATE TABLE recurring_debts (
  id BIGINT PRIMARY KEY,
  debt_id BIGINT REFERENCES debts(id),
  frequency TEXT,
  next_due_date TIMESTAMP
);

-- AI discovers organically:
1. User: "tạo nợ định kỳ hàng tháng"
2. AI calls: list_tables() or inspect_schema()
3. AI sees: "recurring_debts" table exists
4. AI calls: describe_table('recurring_debts')
5. AI understands structure and inserts data
```

---

## Benefits of Refactor

### 1. True Autonomy
- AI observes environment rather than remembering it
- Can discover changes without prompt updates
- Self-manages long-term memory

### 2. Maintainability
- No massive prompts to maintain
- Schema changes don't require code changes
- Clear separation of concerns

### 3. Scalability
- Can handle complex multi-step operations
- Iterative tool calling for deep reasoning
- No prompt size limitations

### 4. Correctness
- Always works with current schema
- No stale assumptions
- Tool results are ground truth

### 5. Evolvability
- Database can evolve naturally
- AI adapts automatically
- Future-proof architecture

---

## Usage

### Starting the Worker

```bash
# Development
npm run dev

# Deploy to Cloudflare
npm run deploy
```

### Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
API_TELEGRAM=your_telegram_bot_token
NEON_DATABASE_URL=postgresql://user:pass@host/db
```

### Testing the Agent

1. **Send a message to the bot:**
   ```
   "anh nợ Long 500k"
   ```

2. **Watch the logs:**
   ```
   🔧 [ToolExecutor] Executing tool: inspect_schema
   ✅ [ToolExecutor] Tool executed successfully
   🔧 [ToolExecutor] Executing tool: execute_sql
   ✅ [ToolExecutor] Tool executed successfully
   📤 [AIBotAutonomous] Sending messages to Telegram...
   ```

3. **AI responds:**
   ```
   để e ghi nợ nàaa
   anh nợ Long 500k đúng hông 😊
   xong rồi nhaaa 📝
   ```

---

## Migration Notes

### Switching to Autonomous Agent

The refactor preserves backward compatibility:

**Current (Autonomous):**
```typescript
import { AIBotAutonomous as AIBot } from './ai-bot-autonomous';
const bot = new AIBot(apiKey, dbUrl);
```

**Legacy (Original):**
```typescript
import { AIBot } from './ai-bot';
const bot = new AIBot(apiKey, dbUrl);
```

Both work, but autonomous version is recommended.

### Gradual Migration

1. Start with autonomous agent for new features
2. Test thoroughly with existing functionality
3. Monitor tool calling behavior
4. Adjust MAX_ITERATIONS if needed (default: 10)
5. Remove legacy code once confident

---

## Performance Considerations

### Tool Calling Overhead

- Each tool call adds latency (API round-trip)
- Most operations need 2-4 tool calls
- Complex operations may need 5-8 calls
- Max 10 iterations to prevent infinite loops

### Optimization Strategies

1. **Schema Caching** (Future)
   - Cache schema inspection results
   - Invalidate on schema changes
   - Reduce redundant tool calls

2. **Smart Tool Selection**
   - Use `list_tables` before `inspect_schema`
   - Use `describe_table` for focused queries
   - Batch related operations

3. **Prompt Engineering**
   - Clear workflow examples in prompt
   - Encourage efficient tool usage
   - Guide toward minimal tool calls

---

## Troubleshooting

### AI not using tools

**Problem:** AI tries to query without inspecting schema

**Solution:**
- Check system prompt includes tool instructions
- Verify tools are registered in Gemini config
- Ensure tool definitions are correct

### Max iterations reached

**Problem:** AI calls tools repeatedly without finishing

**Solution:**
- Check tool results are properly formatted
- Verify tool executor returns valid JSON
- Increase MAX_ITERATIONS if legitimate complexity

### Tool execution failures

**Problem:** Tool calls fail with errors

**Solution:**
- Check database connection
- Verify SQL syntax in executeToolSql
- Check parameter types match expectations

---

## Future Enhancements

### Recommended Additions

1. **Schema Caching**
   - Cache inspect_schema results in memory
   - Invalidate on schema modifications
   - Reduce redundant inspections

2. **Query Optimization Tool**
   - AI can analyze slow queries
   - Suggest index creation
   - Optimize table structure

3. **Data Migration Tool**
   - AI can restructure data
   - Handle schema migrations
   - Preserve data integrity

4. **Monitoring & Analytics**
   - Track tool usage patterns
   - Identify common operations
   - Optimize frequent queries

5. **Multi-Agent Collaboration**
   - Separate agents for different domains
   - Shared database observation
   - Coordinated actions

---

## Credits

**Refactored by:** AI Architecture Team  
**Date:** January 2026  
**Philosophy:** Database as Observable External Memory  
**Inspired by:** Anthropic's tool use patterns, OpenAI function calling

---

## License

Same as original project license.
