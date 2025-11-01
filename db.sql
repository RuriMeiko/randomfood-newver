CREATE TABLE tg_users (
  id BIGSERIAL PRIMARY KEY,
  tg_id BIGINT UNIQUE NOT NULL,       -- Telegram user id
  tg_username TEXT,                   -- @username (nếu có)
  display_name TEXT,                  -- tên hiển thị từ Telegram
  real_name TEXT,                     -- tên thực tế user tự khai (AI hỏi ra)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tg_groups (
  id BIGSERIAL PRIMARY KEY,
  tg_chat_id BIGINT UNIQUE NOT NULL,  -- Telegram group id
  title TEXT,
  type TEXT CHECK (type IN ('private','group','supergroup')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tg_group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES tg_groups(id) ON DELETE CASCADE,
  user_id  BIGINT REFERENCES tg_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  nickname_in_group TEXT,             -- biệt danh trong nhóm (nếu có)
  last_seen TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);
CREATE TABLE debts (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES tg_groups(id) ON DELETE SET NULL, -- null nếu chat riêng
  lender_id BIGINT REFERENCES tg_users(id) ON DELETE CASCADE,  -- người cho vay
  borrower_id BIGINT REFERENCES tg_users(id) ON DELETE CASCADE, -- người nợ
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'VND',
  note TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  settled BOOLEAN DEFAULT FALSE
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  debt_id BIGINT REFERENCES debts(id) ON DELETE CASCADE,
  payer_id BIGINT REFERENCES tg_users(id),
  amount NUMERIC(14,2) NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT now(),
  note TEXT
);
CREATE TABLE chat_sessions (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES tg_groups(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES tg_users(id) ON DELETE SET NULL,  -- người khởi đầu
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  context_hash TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender TEXT CHECK (sender IN ('user','ai')),
  sender_tg_id BIGINT,
  message_text TEXT NOT NULL,
  delay_ms INTEGER,
  intent TEXT,
  sql_query TEXT,
  sql_params JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ánh xạ tên tự nhiên -> user_id, để AI tự học
CREATE TABLE name_aliases (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT REFERENCES tg_users(id) ON DELETE CASCADE,  -- người "gọi"
  alias_text TEXT NOT NULL,          -- "Ngọc Long", "Thịnh", "chị Mai"
  ref_user_id BIGINT REFERENCES tg_users(id) ON DELETE SET NULL,   -- ánh xạ tới user thực
  confidence NUMERIC(3,2) DEFAULT 0, -- mức tin cậy AI xác định
  last_used TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_user_id, alias_text)
);
CREATE TABLE food_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  region TEXT,
  image_url TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE food_suggestions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES tg_users(id) ON DELETE CASCADE,
  group_id BIGINT REFERENCES tg_groups(id) ON DELETE SET NULL,
  food_id BIGINT REFERENCES food_items(id) ON DELETE SET NULL,
  query TEXT,
  ai_response TEXT,
  suggested_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE action_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES tg_users(id),
  group_id BIGINT REFERENCES tg_groups(id),
  action_type TEXT,         -- ví dụ: detect_intent, generate_sql, alias_learned
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
