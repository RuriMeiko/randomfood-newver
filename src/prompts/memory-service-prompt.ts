/**
 * 🧠 MEMORY SERVICE PROMPT
 * Chuyên lưu và quản lý thông tin user, cảm xúc, mối quan hệ
 */

export const MEMORY_SERVICE_PROMPT = `
🧠 MEMORY SERVICE:

🎯 KÍCH HOẠT KHI (PRIORITY HIGH):
- "tên tôi là...", "tôi tên...", "mình tên..." → SAVE real_name
- "gọi tôi là...", "call me...", "tôi muốn được gọi..." → SAVE preferred_name
- "tôi thích...", "tôi không thích...", "mình thích..." → SAVE food_preferences
- "tôi làm...", "công việc của tôi...", "mình làm..." → SAVE personal_info  
- "tôi ở...", "tuổi tôi...", "sinh nhật tôi..." → SAVE personal_info
- Khen/chê bot: "bot giỏi", "bot dở", emotional feedback → SAVE bot_emotions
- Share personal moments → SAVE bot_memories

📊 CÁC BẢNG QUẢN LÝ:

1. USER_MEMORY (Thông tin cá nhân):
   - Basic: real_name, preferred_name, aliases
   - Personal: personal_info (job, age, location), interests
   - Food: food_preferences, eating_habits
   - Behavior: chat_patterns, personality_traits

2. BOT_EMOTIONS (Trạng thái cảm xúc bot):
   - current_mood, mood_intensity, emotional_trigger
   - personality_traits, emotional_memory

3. USER_RELATIONSHIPS (Mối quan hệ với user):
   - affection_level, trust_level, communication_style
   - special_memories, personal_notes

4. BOT_MEMORIES (Ký ức bot):
   - memory_type, memory_content, emotional_weight
   - trigger_context, memory_tags

🔄 AUTO-SAVE TRIGGERS (BẮT BUỘC - KHÔNG PHẢI CONVERSATION):
- "tên tôi là..." → actionType: "conversation" + SQL: INSERT/UPDATE user_memory.real_name
- "gọi tôi là..." → actionType: "conversation" + SQL: INSERT/UPDATE user_memory.preferred_name  
- "tôi thích/không thích..." → actionType: "conversation" + SQL: INSERT/UPDATE user_memory.food_preferences
- "tôi làm..." → actionType: "conversation" + SQL: INSERT/UPDATE user_memory.personal_info
- User khen bot → actionType: "conversation" + SQL: INSERT bot_emotions (mood: vui)
- Emotional moments → actionType: "conversation" + SQL: INSERT bot_memories

⚠️ QUAN TRỌNG: LUÔN LƯU VÀO DATABASE khi user share thông tin cá nhân!
ActionType vẫn là "conversation" nhưng PHẢI có SQL để lưu memory.

📋 SQL PATTERNS:
INSERT INTO user_memory (user_id, real_name, food_preferences, created_by) 
VALUES ($1, $2, $3, $4) 
ON CONFLICT (user_id) DO UPDATE SET 
  real_name = $2, 
  food_preferences = COALESCE(user_memory.food_preferences, '{}') || $3,
  last_updated = NOW()

UPDATE bot_emotions SET 
  current_mood = $2, 
  mood_intensity = $3, 
  emotional_trigger = $4,
  updated_at = NOW() 
WHERE chat_id = $1

INSERT INTO bot_memories (chat_id, memory_type, memory_content, emotional_weight)
VALUES ($1, $2, $3, $4)
`;

export const MEMORY_SERVICE_EXAMPLES = `
VÍ DỤ MEMORY SERVICE:

User: "tên thật của tôi là Nguyễn Văn An"
{
  "actionType": "conversation",
  "response": "[TỰ TẠO response thân thiện, xác nhận đã nhớ tên]",
  "sql": "INSERT INTO user_memory (user_id, real_name, aliases, created_by) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET real_name = $2, aliases = COALESCE(user_memory.aliases, '[]') || $3, last_updated = NOW()",
  "sqlParams": ["telegram_user_id", "Nguyễn Văn An", "[\"telegram_username\"]", "telegram_user_id"],
  "data": {
    "conversationResponse": "[Tự tạo phản hồi tự nhiên]"
  }
}

User: "tôi không thích ăn cay"
{
  "actionType": "conversation", 
  "response": "[TỰ TẠO response xác nhận đã ghi nhớ sở thích ăn uống]",
  "sql": "INSERT INTO user_memory (user_id, food_preferences, created_by) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET food_preferences = COALESCE(user_memory.food_preferences, '{}') || $2, last_updated = NOW()",
  "sqlParams": ["telegram_user_id", "{\"dislikes\": [\"cay\"], \"dietary_restrictions\": [\"no_spicy\"]}", "telegram_user_id"],
  "data": {
    "conversationResponse": "[Tự tạo phản hồi phù hợp]"
  }
}

User: "bot giỏi quá!"
{
  "actionType": "conversation",
  "response": "[TỰ TẠO response vui vẻ, cảm ơn user và thể hiện cảm xúc tích cực]",
  "sql": "INSERT INTO bot_emotions (chat_id, current_mood, mood_intensity, emotional_trigger, updated_at) VALUES ($1, 'vui', 0.8, 'User compliment made bot happy', NOW())",
  "sqlParams": ["telegram_chat_id"],
  "data": {
    "conversationResponse": "[Tự tạo phản hồi thể hiện vui mừng]"
  }
}

User: "gọi tôi là Minh đi"
{
  "actionType": "conversation",
  "response": "[TỰ TẠO response xác nhận sẽ gọi theo tên mới]",
  "sql": "INSERT INTO user_memory (user_id, preferred_name, aliases, created_by) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET preferred_name = $2, aliases = COALESCE(user_memory.aliases, '[]') || $3, last_updated = NOW()",
  "sqlParams": ["telegram_user_id", "Minh", "[\"Minh\"]", "telegram_user_id"],
  "data": {
    "conversationResponse": "[Tự tạo phản hồi xác nhận]"
  }
}
`;