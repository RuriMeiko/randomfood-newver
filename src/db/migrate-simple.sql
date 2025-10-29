-- Drop all old tables
DROP TABLE IF EXISTS debt CASCADE;
DROP TABLE IF EXISTS tag CASCADE; 
DROP TABLE IF EXISTS credit CASCADE;
DROP TABLE IF EXISTS command CASCADE;
DROP TABLE IF EXISTS historyfood CASCADE;
DROP TABLE IF EXISTS subfood CASCADE;
DROP TABLE IF EXISTS mainfood CASCADE;

-- Create new simple table for food suggestions
CREATE TABLE IF NOT EXISTS food_suggestions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_food_suggestions_user_id ON food_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_food_suggestions_created_at ON food_suggestions(created_at DESC);