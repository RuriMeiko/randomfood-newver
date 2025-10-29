-- AI Food & Debt Bot Database Migration
-- Drop all old tables and create new AI-powered schema

-- Drop existing tables
DROP TABLE IF EXISTS debt CASCADE;
DROP TABLE IF EXISTS tag CASCADE; 
DROP TABLE IF EXISTS credit CASCADE;
DROP TABLE IF EXISTS command CASCADE;
DROP TABLE IF EXISTS historyfood CASCADE;
DROP TABLE IF EXISTS subfood CASCADE;
DROP TABLE IF EXISTS mainfood CASCADE;
DROP TABLE IF EXISTS food_suggestions CASCADE;

-- Create food suggestions table (enhanced)
CREATE TABLE IF NOT EXISTS food_suggestions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  username TEXT,
  suggestion TEXT NOT NULL,
  prompt TEXT,
  ai_response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create debts table for natural language debt tracking
CREATE TABLE IF NOT EXISTS debts (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  debtor_user_id TEXT NOT NULL,
  debtor_username TEXT,
  creditor_user_id TEXT NOT NULL,
  creditor_username TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'VND',
  description TEXT,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  ai_detection TEXT
);

-- Create chat members table for tracking group users
CREATE TABLE IF NOT EXISTS chat_members (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- Create AI conversations log for analysis and improvements
CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  action_type TEXT,
  processing_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_suggestions_user_id ON food_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_food_suggestions_created_at ON food_suggestions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_debts_chat_id ON debts(chat_id);
CREATE INDEX IF NOT EXISTS idx_debts_debtor ON debts(debtor_user_id);
CREATE INDEX IF NOT EXISTS idx_debts_creditor ON debts(creditor_user_id);
CREATE INDEX IF NOT EXISTS idx_debts_unpaid ON debts(chat_id, is_paid);

CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_active ON chat_members(chat_id, is_active);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_chat_id ON ai_conversations(chat_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_action_type ON ai_conversations(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- Insert sample data for testing (optional)
-- INSERT INTO chat_members (chat_id, user_id, username, first_name) VALUES 
-- ('-1001234567890', '123456789', 'user1', 'User One'),
-- ('-1001234567890', '987654321', 'user2', 'User Two');

COMMENT ON TABLE food_suggestions IS 'AI-generated food suggestions with full context';
COMMENT ON TABLE debts IS 'Natural language processed debt tracking between users';
COMMENT ON TABLE chat_members IS 'Group chat members for AI context and debt resolution';
COMMENT ON TABLE ai_conversations IS 'All AI interactions for analysis and improvements';