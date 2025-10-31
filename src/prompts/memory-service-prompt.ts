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

📋 MEMORY SAVE PATTERNS:
- User names: Use ON CONFLICT for user_memory table
- Food preferences: Merge with existing using ||
- Bot emotions: INSERT new emotional states  
- Personal info: JSON format for flexible storage
`;

export const MEMORY_SERVICE_EXAMPLES = `
🧠 MEMORY SERVICE GUIDANCE:
- Names: Auto-save when "tên tôi là...", "gọi tôi là..."
- Preferences: Save food likes/dislikes to user_memory.food_preferences  
- Emotions: Save bot mood changes to bot_emotions
- Personal info: Store jobs, age, location in user_memory.personal_info
- Always use actionType: "conversation" + SQL to save memory
`;