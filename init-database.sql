-- Database Initialization Script
-- Simple Debt Tracking with Automatic Consolidation via Views

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Users
CREATE TABLE IF NOT EXISTS tg_users (
  id BIGSERIAL PRIMARY KEY,
  tg_id BIGINT UNIQUE NOT NULL,
  tg_username TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups/Chats
CREATE TABLE IF NOT EXISTS tg_groups (
  id BIGSERIAL PRIMARY KEY,
  tg_chat_id BIGINT UNIQUE NOT NULL,
  title TEXT,
  type TEXT CHECK (type IN ('private', 'group', 'supergroup')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debts - Simple: who lends to whom and how much
-- No "settled" flag - just insert debt records
-- Consolidation happens automatically via views when querying
CREATE TABLE IF NOT EXISTS debts (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES tg_groups(id) ON DELETE SET NULL,
  lender_id BIGINT REFERENCES tg_users(id) ON DELETE CASCADE NOT NULL,
  borrower_id BIGINT REFERENCES tg_users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history (for AI context)
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  sender TEXT CHECK (sender IN ('user', 'ai')) NOT NULL,
  sender_tg_id BIGINT,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Name aliases (AI learns nicknames)
CREATE TABLE IF NOT EXISTS name_aliases (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT REFERENCES tg_users(id) ON DELETE CASCADE NOT NULL,
  alias_text TEXT NOT NULL,
  ref_user_id BIGINT REFERENCES tg_users(id) ON DELETE SET NULL,
  UNIQUE(owner_user_id, alias_text)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_debts_lender ON debts(lender_id);
CREATE INDEX IF NOT EXISTS idx_debts_borrower ON debts(borrower_id);
CREATE INDEX IF NOT EXISTS idx_debts_group ON debts(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ==========================================
-- VIEWS FOR AUTOMATIC DEBT CONSOLIDATION
-- ==========================================

-- View: Net debts between each pair of users (auto-consolidation)
-- Returns only the net amount after offsetting mutual debts
-- Example: A lends B 500k, B lends A 300k → Result: A lends B 200k
CREATE OR REPLACE VIEW net_debts AS
WITH debt_pairs AS (
  SELECT 
    LEAST(lender_id, borrower_id) as user1_id,
    GREATEST(lender_id, borrower_id) as user2_id,
    group_id,
    SUM(CASE WHEN lender_id < borrower_id THEN amount ELSE -amount END) as net_amount
  FROM debts
  GROUP BY 
    LEAST(lender_id, borrower_id),
    GREATEST(lender_id, borrower_id),
    group_id
)
SELECT 
  user1_id,
  user2_id,
  group_id,
  CASE 
    WHEN net_amount > 0 THEN user1_id
    ELSE user2_id
  END as lender_id,
  CASE 
    WHEN net_amount > 0 THEN user2_id
    ELSE user1_id
  END as borrower_id,
  ABS(net_amount) as amount
FROM debt_pairs
WHERE net_amount != 0;

-- View: User debts with display names
-- Shows consolidated debts between users with names
CREATE OR REPLACE VIEW user_debts AS
SELECT 
  nd.borrower_id,
  borrower.display_name as borrower_name,
  nd.lender_id,
  lender.display_name as lender_name,
  nd.amount,
  nd.group_id,
  g.title as group_name
FROM net_debts nd
JOIN tg_users borrower ON nd.borrower_id = borrower.id
JOIN tg_users lender ON nd.lender_id = lender.id
LEFT JOIN tg_groups g ON nd.group_id = g.id
ORDER BY nd.amount DESC;

-- View: Balance per user
-- Total owed and total lending for each user after consolidation
CREATE OR REPLACE VIEW user_balance AS
SELECT 
  user_id,
  user_name,
  group_id,
  group_name,
  SUM(total_lent) as total_lent,
  SUM(total_owed) as total_owed,
  SUM(total_lent - total_owed) as net_balance
FROM (
  SELECT 
    lender_id as user_id,
    lender_name as user_name,
    group_id,
    group_name,
    amount as total_lent,
    0 as total_owed
  FROM user_debts
  UNION ALL
  SELECT 
    borrower_id as user_id,
    borrower_name as user_name,
    group_id,
    group_name,
    0 as total_lent,
    amount as total_owed
  FROM user_debts
) combined
GROUP BY user_id, user_name, group_id, group_name;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function: Get net debt between two users
-- Returns consolidated debt after offsetting
CREATE OR REPLACE FUNCTION get_net_debt(
  p_user1_id BIGINT,
  p_user2_id BIGINT,
  p_group_id BIGINT DEFAULT NULL
) RETURNS TABLE(
  lender_id BIGINT,
  borrower_id BIGINT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nd.lender_id,
    nd.borrower_id,
    nd.amount
  FROM net_debts nd
  WHERE ((nd.user1_id = p_user1_id AND nd.user2_id = p_user2_id)
     OR (nd.user1_id = p_user2_id AND nd.user2_id = p_user1_id))
    AND (p_group_id IS NULL OR nd.group_id = p_group_id);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- EXAMPLE QUERIES
-- ==========================================

-- Get all consolidated debts for a user
-- SELECT * FROM user_debts WHERE borrower_id = 123 OR lender_id = 123;

-- Get user's balance
-- SELECT * FROM user_balance WHERE user_id = 123;

-- Get net debt between two specific users
-- SELECT * FROM get_net_debt(user1_id, user2_id);

-- Insert a new debt (AI will do this via execute_sql tool)
-- INSERT INTO debts (group_id, lender_id, borrower_id, amount, note)
-- VALUES (1, 10, 20, 500000, 'Borrowed for lunch');

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database initialized successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables created:';
  RAISE NOTICE '   - tg_users: Telegram users';
  RAISE NOTICE '   - tg_groups: Telegram groups';
  RAISE NOTICE '   - debts: Simple debt records';
  RAISE NOTICE '   - chat_messages: Chat history';
  RAISE NOTICE '   - name_aliases: Nickname learning';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Views for automatic consolidation:';
  RAISE NOTICE '   - net_debts: Auto-consolidated debts';
  RAISE NOTICE '   - user_debts: Debts with user names';
  RAISE NOTICE '   - user_balance: Total balance per user';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 How it works:';
  RAISE NOTICE '   1. Insert debts into "debts" table (simple records)';
  RAISE NOTICE '   2. Query "user_debts" view → automatic consolidation';
  RAISE NOTICE '   3. No need to manually consolidate or update';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Example:';
  RAISE NOTICE '   - Insert: A lends B 500k';
  RAISE NOTICE '   - Insert: B lends A 300k';
  RAISE NOTICE '   - Query: SELECT * FROM user_debts';
  RAISE NOTICE '   - Result: A lends B 200k (auto-calculated!)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Database is ready!';
END $$;
