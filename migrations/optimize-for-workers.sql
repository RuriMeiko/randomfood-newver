-- Optimization for Cloudflare Workers
-- Offload computation-heavy tasks to PostgreSQL

-- ========================================
-- 1. Create materialized view for schema info (faster than information_schema)
-- ========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_schema_info AS
SELECT 
  json_agg(
    json_build_object(
      'table_name', table_name,
      'column_count', (
        SELECT COUNT(*) 
        FROM information_schema.columns c 
        WHERE c.table_schema = t.table_schema 
        AND c.table_name = t.table_name
      )
    )
  ) as schema_data
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Refresh function (call this when schema changes)
CREATE OR REPLACE FUNCTION refresh_schema_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_schema_info;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. Create function to get user context (all in one DB call)
-- ========================================
CREATE OR REPLACE FUNCTION get_user_context(
  p_user_tg_id BIGINT,
  p_chat_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', u.id,
    'user_name', u.display_name,
    'user_username', u.tg_username,
    'group_id', g.id,
    'group_name', g.title,
    'is_group', g.type != 'private'
  )
  INTO v_result
  FROM tg_users u
  LEFT JOIN tg_groups g ON g.tg_chat_id = p_chat_id
  WHERE u.tg_id = p_user_tg_id
  LIMIT 1;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. Create function to get recent messages with sender info
-- ========================================
CREATE OR REPLACE FUNCTION get_recent_messages_optimized(
  p_chat_id BIGINT,
  p_limit INT DEFAULT 30
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'message_text', cm.message_text,
        'sender_name', COALESCE(u.display_name, u.tg_username, 'Unknown'),
        'sender', cm.sender,
        'created_at', cm.created_at
      )
      ORDER BY cm.created_at ASC
    )
    FROM (
      SELECT * FROM chat_messages
      WHERE chat_id = p_chat_id
      ORDER BY created_at DESC
      LIMIT p_limit
    ) cm
    LEFT JOIN tg_users u ON cm.sender_tg_id = u.tg_id
    ORDER BY cm.created_at ASC
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. Create function to get cross-chat context
-- ========================================
CREATE OR REPLACE FUNCTION get_cross_chat_context(
  p_user_tg_id BIGINT,
  p_current_chat_id BIGINT,
  p_time_limit_minutes INT DEFAULT 60,
  p_max_chats INT DEFAULT 1,
  p_messages_per_chat INT DEFAULT 15
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'chat_id', recent_chat.chat_id,
        'chat_name', recent_chat.chat_name,
        'chat_type', recent_chat.chat_type,
        'minutes_ago', recent_chat.minutes_ago,
        'messages', (
          SELECT json_agg(
            json_build_object(
              'sender_name', COALESCE(u.display_name, u.tg_username, 'Unknown'),
              'message_text', cm.message_text
            )
            ORDER BY cm.created_at DESC
          )
          FROM (
            SELECT * FROM chat_messages
            WHERE chat_id = recent_chat.chat_id
            ORDER BY created_at DESC
            LIMIT p_messages_per_chat
          ) cm
          LEFT JOIN tg_users u ON cm.sender_tg_id = u.tg_id
        )
      )
    )
    FROM (
      SELECT DISTINCT ON (cm.chat_id)
        cm.chat_id as chat_id,
        g.title as chat_name,
        g.type as chat_type,
        EXTRACT(EPOCH FROM (NOW() - MAX(cm.created_at)))::INT / 60 as minutes_ago
      FROM chat_messages cm
      LEFT JOIN tg_groups g ON cm.chat_id = g.tg_chat_id
      WHERE cm.sender_tg_id = p_user_tg_id
        AND cm.chat_id != p_current_chat_id
        AND cm.created_at > NOW() - INTERVAL '1 hour' * p_time_limit_minutes / 60
      GROUP BY cm.chat_id, g.title, g.type
      ORDER BY cm.chat_id, MAX(cm.created_at) DESC
      LIMIT p_max_chats
    ) recent_chat
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. Create indexes for faster queries
-- ========================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_chat_time 
  ON chat_messages(sender_tg_id, chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_time 
  ON chat_messages(chat_id, created_at DESC);

-- ========================================
-- Usage Examples:
-- ========================================

-- Get schema (cached in materialized view):
-- SELECT schema_data FROM mv_schema_info;

-- Get user context (1 DB call instead of 2):
-- SELECT get_user_context(123456789, 987654321);

-- Get recent messages optimized (1 query with JOIN):
-- SELECT get_recent_messages_optimized(987654321, 30);

-- Get cross-chat context (1 complex query instead of multiple):
-- SELECT get_cross_chat_context(123456789, 987654321, 60, 1, 15);
