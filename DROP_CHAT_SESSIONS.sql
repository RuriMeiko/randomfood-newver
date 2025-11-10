-- Complete removal of chat_sessions table
-- Run this after the main migration is complete

-- Drop the chat_sessions table and all its constraints
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Verify removal
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'chat_sessions';
-- Should return no rows if successfully dropped

-- Show remaining tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;