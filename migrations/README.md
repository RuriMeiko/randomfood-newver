# Database Migrations

## Setup Scripts

### 1. `init-database.sql`
**Purpose:** Initial database schema setup  
**Run:** Once when setting up new database  
**Command:**
```bash
psql $NEON_DATABASE_URL -f migrations/init-database.sql
```

**Creates:**
- `tg_users` - Telegram users
- `tg_groups` - Telegram groups
- `debts` - Debt tracking
- `chat_messages` - Conversation history
- `name_aliases` - User name preferences
- `bot_emotional_state` - Bot's emotional state
- `interaction_events` - Emotional interaction logs

---

### 2. `init-api-keys.sql`
**Purpose:** API key management table with rate limiting  
**Run:** After `init-database.sql`  
**Command:**
```bash
psql $NEON_DATABASE_URL -f migrations/init-api-keys.sql
```

**Creates:**
- `api_keys` table with RPM/RPD tracking
- PostgreSQL functions:
  - `increment_request_count(key_name)` - Atomic counter increment
  - `is_key_available(key_name)` - Check if key can be used
  - `mark_key_failed(key_name, is_429)` - Mark key as failed
  - `mark_key_success(key_name)` - Reset failure counter
- Triggers:
  - `reset_rpm_counters` - Reset requests_per_minute every minute
  - `reset_rpd_counters` - Reset requests_per_day every day

**After running, insert your API keys:**
```sql
INSERT INTO api_keys (key_name, api_key, rpm_limit, rpd_limit, is_active)
VALUES 
  ('primary', 'AIza...your_key_here...', 5, 20, TRUE),
  ('key_1', 'AIza...another_key...', 5, 20, TRUE),
  ('key_2', 'AIza...third_key...', 5, 20, TRUE);
```

---

## Migrations

### 3. `add-real-name-column.sql`
**Purpose:** Add missing columns to existing tables  
**Run:** If upgrading from older schema  
**Command:**
```bash
psql $NEON_DATABASE_URL -f migrations/add-real-name-column.sql
```

**Adds:**
- `tg_users.real_name` - User's real name (TEXT)
- `tg_users.updated_at` - Last update timestamp
- `chat_messages.delay_ms` - Message delay in milliseconds
- `chat_messages.intent` - Message intent classification
- `chat_messages.sql_query` - SQL query used (if any)
- `chat_messages.sql_params` - SQL parameters (if any)

---

## Migration Order

**For new database:**
```bash
# 1. Base schema
psql $NEON_DATABASE_URL -f migrations/init-database.sql

# 2. API key management
psql $NEON_DATABASE_URL -f migrations/init-api-keys.sql

# 3. Insert API keys
psql $NEON_DATABASE_URL -c "INSERT INTO api_keys ..."
```

**For existing database:**
```bash
# Apply missing columns
psql $NEON_DATABASE_URL -f migrations/add-real-name-column.sql

# Add API key system
psql $NEON_DATABASE_URL -f migrations/init-api-keys.sql

# Insert API keys
psql $NEON_DATABASE_URL -c "INSERT INTO api_keys ..."
```

---

## Verification

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check API keys
SELECT key_name, rpm_limit, rpd_limit, 
       requests_per_minute, requests_per_day, 
       is_active, is_blocked 
FROM api_keys;

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Check functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
```

---

## Notes

- **RPM Limit:** 5 requests per minute per key (Gemini free tier)
- **RPD Limit:** 20 requests per day per key (Gemini free tier)
- **Auto-reset:** Counters reset automatically via PostgreSQL triggers
- **Blocking:** Keys auto-block on 429 errors for 1 minute
- **Rotation:** Application automatically rotates to next available key
