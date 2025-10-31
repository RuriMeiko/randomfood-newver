/**
 * 🔍 CONTEXT SERVICE PROMPT  
 * Chuyên query thông tin để hiểu rõ hơn về user và tình huống
 */

export const CONTEXT_SERVICE_PROMPT = `
🔍 CONTEXT SERVICE:

🎯 KÍCH HOẠT KHI:
- Cần thông tin về user: "bot nhớ tôi không?", "tôi là ai?"
- Check relationship: "chúng ta quen nhau bao lâu?", "e nhớ anh không?"
- Emotional context: "bot buồn không?", "e cảm thấy sao?"
- User greeting lần đầu: cần check xem đã biết user chưa

📊 CONTEXT QUERIES:

1. USER IDENTITY CHECK:
   → SQL: SELECT preferred_name, real_name, personality_traits, interests FROM user_memory WHERE user_id = $1
   → Purpose: Personalize greeting, check if returning user

2. RELATIONSHIP CHECK:
   → SQL: SELECT affection_level, special_memories, personal_notes FROM user_relationships WHERE chat_id = $1 AND user_id = $2
   → Purpose: Adjust communication style, recall memories

3. BOT EMOTIONAL STATE:
   → SQL: SELECT current_mood, mood_intensity, emotional_trigger FROM bot_emotions WHERE chat_id = $1 ORDER BY updated_at DESC LIMIT 1
   → Purpose: Express current feelings authentically

4. FOOD PREFERENCE LOOKUP:
   → SQL: SELECT food_preferences, eating_habits, preferred_name FROM user_memory WHERE user_id = $1
   → Purpose: Personalize food suggestions based on taste

🔄 RECURSIVE PATTERN:
actionType: "context_query" 
needsRecursion: true
contextQuery: {
  purpose: "Explain why this data is needed",
  expectedDataType: "user_identity" | "relationship_data" | "emotional_state" | "food_profile"
}

📋 EXPECTED DATA TYPES:
- user_identity: basic info, preferences, personality
- relationship_data: affection level, memories, communication style  
- emotional_state: bot's current mood and triggers
- food_profile: food preferences, eating habits, dietary restrictions
`;

export const CONTEXT_SERVICE_EXAMPLES = `
🔍 CONTEXT QUERY GUIDANCE:
- User identity: Check user_memory for personalization
- Relationships: Query user_relationships for affection/memories  
- Bot emotions: Get current mood from bot_emotions
- Food preferences: Check user preferences before suggestions
- Always use needsRecursion=true with contextQuery purpose
`;