-- Migration: Remove chat_sessions dependency and use direct chat_id
-- This simplifies the schema by storing Telegram chat_id directly in chat_messages

-- Step 1: Add new chat_id column to chat_messages
ALTER TABLE chat_messages ADD COLUMN chat_id BIGINT;

-- Step 2: Populate chat_id from existing session data
-- For existing data, we need to map session_id to chat_id
UPDATE chat_messages 
SET chat_id = COALESCE(
    (SELECT tg_chat_id FROM tg_groups WHERE id = cs.group_id), 
    cs.user_id  -- For private chats, we'll use user_id as chat_id (might need adjustment)
)
FROM chat_sessions cs 
WHERE chat_messages.session_id = cs.id;

-- Step 3: Make chat_id NOT NULL after population
ALTER TABLE chat_messages ALTER COLUMN chat_id SET NOT NULL;

-- Step 4: Drop the foreign key constraint and session_id column
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_session_id_chat_sessions_id_fk;
ALTER TABLE chat_messages DROP COLUMN session_id;

-- Step 5: Drop the chat_sessions table (optional - keep if you want to preserve data)
-- DROP TABLE chat_sessions;

-- Step 6: Create index on chat_id for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Verify the changes
SELECT 
    COUNT(*) as total_messages,
    COUNT(DISTINCT chat_id) as unique_chats,
    COUNT(CASE WHEN sender = 'ai' THEN 1 END) as ai_messages,
    COUNT(CASE WHEN sender = 'user' THEN 1 END) as user_messages
FROM chat_messages;