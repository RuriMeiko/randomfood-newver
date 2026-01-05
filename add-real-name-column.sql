-- Add missing columns to tg_users table
ALTER TABLE tg_users ADD COLUMN IF NOT EXISTS real_name text;
ALTER TABLE tg_users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Add missing columns to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delay_ms integer;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS intent text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sql_query text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sql_params jsonb;

-- Verify the columns were added
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('tg_users', 'chat_messages')
ORDER BY table_name, ordinal_position;
