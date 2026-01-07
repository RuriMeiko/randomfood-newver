-- Block all API keys except key with id = 19
-- Block duration: 2 months from now

UPDATE api_keys
SET 
  is_blocked = TRUE,
  blocked_until = NOW() + INTERVAL '2 months',
  updated_at = NOW()
WHERE id != 19;

-- Show results
SELECT 
  id,
  key_name,
  is_blocked,
  blocked_until AT TIME ZONE 'Asia/Bangkok' as blocked_until_ict,
  CASE 
    WHEN id = 19 THEN '✅ ACTIVE'
    ELSE '🚫 BLOCKED'
  END as status
FROM api_keys
ORDER BY id;
