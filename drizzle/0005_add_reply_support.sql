-- Add telegram_message_id and reply_to_message_id columns to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT,
ADD COLUMN IF NOT EXISTS reply_to_message_id BIGINT;

-- Create index for faster lookup by telegram_message_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_telegram_msg_id 
ON chat_messages(chat_id, telegram_message_id);

-- Create index for reply lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to 
ON chat_messages(reply_to_message_id) 
WHERE reply_to_message_id IS NOT NULL;
