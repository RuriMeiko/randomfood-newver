-- API Keys Management Table
-- This table is NEVER exposed to AI context
-- It's purely for system-level rate limiting and key rotation

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL, -- e.g., "primary", "key_1", "key_2"
  api_key TEXT NOT NULL, -- The actual API key
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Rate limiting counters
  requests_per_minute INTEGER DEFAULT 0, -- Current RPM count
  requests_per_day INTEGER DEFAULT 0, -- Current RPD count
  
  -- Limits
  rpm_limit INTEGER DEFAULT 5, -- Requests per minute limit
  rpd_limit INTEGER DEFAULT 20, -- Requests per day limit
  
  -- Status tracking
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMPTZ, -- When the key will be unblocked
  failure_count INTEGER DEFAULT 0,
  last_failure TIMESTAMPTZ,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  last_reset_minute TIMESTAMPTZ DEFAULT NOW(), -- For RPM reset
  last_reset_day TIMESTAMPTZ DEFAULT NOW(), -- For RPD reset
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_blocked ON api_keys(is_blocked, blocked_until);

-- Function to reset RPM counter every minute
CREATE OR REPLACE FUNCTION reset_rpm_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF EXTRACT(EPOCH FROM (NOW() - NEW.last_reset_minute)) >= 60 THEN
    NEW.requests_per_minute := 0;
    NEW.last_reset_minute := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reset RPD counter every day
CREATE OR REPLACE FUNCTION reset_rpd_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF EXTRACT(EPOCH FROM (NOW() - NEW.last_reset_day)) >= 86400 THEN
    NEW.requests_per_day := 0;
    NEW.last_reset_day := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic counter reset
DROP TRIGGER IF EXISTS trg_reset_rpm ON api_keys;
CREATE TRIGGER trg_reset_rpm
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION reset_rpm_counters();

DROP TRIGGER IF EXISTS trg_reset_rpd ON api_keys;
CREATE TRIGGER trg_reset_rpd
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION reset_rpd_counters();

-- Function to increment request count
CREATE OR REPLACE FUNCTION increment_request_count(p_key_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET 
    requests_per_minute = requests_per_minute + 1,
    requests_per_day = requests_per_day + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE key_name = p_key_name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if key is available
CREATE OR REPLACE FUNCTION is_key_available(p_key_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_key api_keys;
BEGIN
  SELECT * INTO v_key FROM api_keys WHERE key_name = p_key_name AND is_active = TRUE;
  
  IF v_key IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if blocked
  IF v_key.is_blocked AND v_key.blocked_until > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Unblock if cooldown passed
  IF v_key.is_blocked AND v_key.blocked_until <= NOW() THEN
    UPDATE api_keys
    SET is_blocked = FALSE, blocked_until = NULL, failure_count = 0
    WHERE key_name = p_key_name;
  END IF;
  
  -- Check RPM limit
  IF v_key.requests_per_minute >= v_key.rpm_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Check RPD limit
  IF v_key.requests_per_day >= v_key.rpd_limit THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to mark key as failed (429 error)
CREATE OR REPLACE FUNCTION mark_key_failed(p_key_name TEXT, p_is_429 BOOLEAN DEFAULT FALSE)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET 
    failure_count = failure_count + 1,
    last_failure = NOW(),
    is_blocked = CASE WHEN p_is_429 OR failure_count + 1 >= 3 THEN TRUE ELSE is_blocked END,
    blocked_until = CASE WHEN p_is_429 OR failure_count + 1 >= 3 THEN NOW() + INTERVAL '1 minute' ELSE blocked_until END,
    updated_at = NOW()
  WHERE key_name = p_key_name;
END;
$$ LANGUAGE plpgsql;

-- Function to mark key as successful
CREATE OR REPLACE FUNCTION mark_key_success(p_key_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET 
    failure_count = 0,
    is_blocked = FALSE,
    blocked_until = NULL,
    last_failure = NULL,
    updated_at = NOW()
  WHERE key_name = p_key_name;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '✅ API Keys management system initialized!';
RAISE NOTICE '';
RAISE NOTICE '🔑 Functions available:';
RAISE NOTICE '   - increment_request_count(key_name) - Track API usage';
RAISE NOTICE '   - is_key_available(key_name) - Check if key can be used';
RAISE NOTICE '   - mark_key_failed(key_name, is_429) - Mark key as failed';
RAISE NOTICE '   - mark_key_success(key_name) - Mark key as successful';
RAISE NOTICE '';
RAISE NOTICE '📊 Rate limits:';
RAISE NOTICE '   - RPM: 5 requests per minute (default)';
RAISE NOTICE '   - RPD: 20 requests per day (default)';
RAISE NOTICE '';
RAISE NOTICE '⚠️  This table is NEVER visible to AI!';
