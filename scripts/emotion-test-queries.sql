-- ============================================
-- EMOTION TEST QUERIES
-- Copy & paste vào database để test nhanh
-- ============================================

-- ============================================
-- 1. XEM TRẠNG THÁI HIỆN TẠI
-- ============================================

SELECT 
  emotion_name,
  value::float as value,
  last_updated,
  CASE 
    WHEN value < 0.3 THEN '😢 Low'
    WHEN value < 0.45 THEN '😐 Below Neutral'
    WHEN value < 0.55 THEN '😊 Neutral'
    WHEN value < 0.7 THEN '🙂 Above Neutral'
    ELSE '😄 High'
  END as level
FROM bot_emotional_state
ORDER BY value DESC;

-- ============================================
-- 2. PRESET: HAPPY (Rất vui vẻ)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.90, NOW()),
  ('sadness', 0.10, NOW()),
  ('anger', 0.10, NOW()),
  ('fear', 0.20, NOW()),
  ('trust', 0.80, NOW()),
  ('disgust', 0.10, NOW()),
  ('affection', 0.85, NOW()),
  ('hurt', 0.10, NOW()),
  ('playfulness', 0.90, NOW()),
  ('neediness', 0.30, NOW()),
  ('warmth', 0.90, NOW()),
  ('excitement', 0.85, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 3. PRESET: SAD (Buồn bã, tủi thân)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.15, NOW()),
  ('sadness', 0.90, NOW()),
  ('anger', 0.20, NOW()),
  ('fear', 0.40, NOW()),
  ('trust', 0.30, NOW()),
  ('disgust', 0.20, NOW()),
  ('affection', 0.40, NOW()),
  ('hurt', 0.70, NOW()),
  ('playfulness', 0.10, NOW()),
  ('neediness', 0.85, NOW()),
  ('warmth', 0.30, NOW()),
  ('excitement', 0.10, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 4. PRESET: ANGRY (Đang giận, hờn dỗi)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.10, NOW()),
  ('sadness', 0.30, NOW()),
  ('anger', 0.90, NOW()),
  ('fear', 0.20, NOW()),
  ('trust', 0.15, NOW()),
  ('disgust', 0.60, NOW()),
  ('affection', 0.20, NOW()),
  ('hurt', 0.70, NOW()),
  ('playfulness', 0.05, NOW()),
  ('neediness', 0.30, NOW()),
  ('warmth', 0.10, NOW()),
  ('excitement', 0.20, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 5. PRESET: POUTY (Hờn dỗi cute)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.25, NOW()),
  ('sadness', 0.50, NOW()),
  ('anger', 0.60, NOW()),
  ('fear', 0.20, NOW()),
  ('trust', 0.35, NOW()),
  ('disgust', 0.30, NOW()),
  ('affection', 0.50, NOW()),
  ('hurt', 0.55, NOW()),
  ('playfulness', 0.20, NOW()),
  ('neediness', 0.80, NOW()),
  ('warmth', 0.35, NOW()),
  ('excitement', 0.15, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 6. PRESET: JEALOUS (Ghen tuông)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.10, NOW()),
  ('sadness', 0.60, NOW()),
  ('anger', 0.75, NOW()),
  ('fear', 0.70, NOW()),
  ('trust', 0.10, NOW()),
  ('disgust', 0.40, NOW()),
  ('affection', 0.55, NOW()),
  ('hurt', 0.80, NOW()),
  ('playfulness', 0.05, NOW()),
  ('neediness', 0.95, NOW()),
  ('warmth', 0.20, NOW()),
  ('excitement', 0.10, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 7. PRESET: CLINGY (Nhớ nhung)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.35, NOW()),
  ('sadness', 0.50, NOW()),
  ('anger', 0.15, NOW()),
  ('fear', 0.45, NOW()),
  ('trust', 0.55, NOW()),
  ('disgust', 0.10, NOW()),
  ('affection', 0.80, NOW()),
  ('hurt', 0.35, NOW()),
  ('playfulness', 0.25, NOW()),
  ('neediness', 0.95, NOW()),
  ('warmth', 0.65, NOW()),
  ('excitement', 0.30, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 8. PRESET: LOVING (Yêu thương ngọt ngào)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.80, NOW()),
  ('sadness', 0.15, NOW()),
  ('anger', 0.10, NOW()),
  ('fear', 0.15, NOW()),
  ('trust', 0.90, NOW()),
  ('disgust', 0.10, NOW()),
  ('affection', 0.95, NOW()),
  ('hurt', 0.10, NOW()),
  ('playfulness', 0.70, NOW()),
  ('neediness', 0.60, NOW()),
  ('warmth', 0.95, NOW()),
  ('excitement', 0.70, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 9. PRESET: HURT (Bị tổn thương)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.10, NOW()),
  ('sadness', 0.80, NOW()),
  ('anger', 0.50, NOW()),
  ('fear', 0.50, NOW()),
  ('trust', 0.10, NOW()),
  ('disgust', 0.30, NOW()),
  ('affection', 0.25, NOW()),
  ('hurt', 0.95, NOW()),
  ('playfulness', 0.05, NOW()),
  ('neediness', 0.90, NOW()),
  ('warmth', 0.15, NOW()),
  ('excitement', 0.05, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 10. RESET VỀ NEUTRAL
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.50, NOW()),
  ('sadness', 0.50, NOW()),
  ('anger', 0.50, NOW()),
  ('fear', 0.50, NOW()),
  ('trust', 0.50, NOW()),
  ('disgust', 0.50, NOW()),
  ('affection', 0.50, NOW()),
  ('hurt', 0.50, NOW()),
  ('playfulness', 0.50, NOW()),
  ('neediness', 0.50, NOW()),
  ('warmth', 0.50, NOW()),
  ('excitement', 0.50, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- 11. RESET VỀ DEFAULT (Positive baseline)
-- ============================================

INSERT INTO bot_emotional_state (emotion_name, value, last_updated)
VALUES
  ('joy', 0.65, NOW()),
  ('sadness', 0.30, NOW()),
  ('anger', 0.20, NOW()),
  ('fear', 0.25, NOW()),
  ('trust', 0.70, NOW()),
  ('disgust', 0.20, NOW()),
  ('affection', 0.75, NOW()),
  ('hurt', 0.20, NOW()),
  ('playfulness', 0.70, NOW()),
  ('neediness', 0.60, NOW()),
  ('warmth', 0.75, NOW()),
  ('excitement', 0.60, NOW())
ON CONFLICT (emotion_name) DO UPDATE SET
  value = EXCLUDED.value,
  last_updated = EXCLUDED.last_updated;

-- ============================================
-- CUSTOM: SET MỘT EMOTION CỤ THỂ
-- ============================================

-- Ví dụ: Set anger = 0.8
UPDATE bot_emotional_state 
SET value = 0.8, last_updated = NOW() 
WHERE emotion_name = 'anger';

-- Ví dụ: Tăng sadness lên 0.2
UPDATE bot_emotional_state 
SET value = LEAST(1.0, value::float + 0.2), last_updated = NOW() 
WHERE emotion_name = 'sadness';

-- Ví dụ: Giảm joy xuống 0.1  
UPDATE bot_emotional_state 
SET value = GREATEST(0.0, value::float - 0.1), last_updated = NOW() 
WHERE emotion_name = 'joy';
