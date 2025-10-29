-- Conversation Context Management Schema
-- Tables for storing conversation history with context window management

-- Conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'bot')),
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation summaries table  
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  message_count INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_chat_user ON conversation_messages(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_type ON conversation_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_chat_user ON conversation_summaries(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_end_time ON conversation_summaries(end_time DESC);

-- Comments
COMMENT ON TABLE conversation_messages IS 'Individual conversation messages with token counting';
COMMENT ON TABLE conversation_summaries IS 'AI-generated summaries of old conversations to manage context window';

COMMENT ON COLUMN conversation_messages.token_count IS 'Estimated token count for context window management';
COMMENT ON COLUMN conversation_summaries.message_count IS 'Number of original messages summarized';
COMMENT ON COLUMN conversation_summaries.token_count IS 'Token count of the summary text';