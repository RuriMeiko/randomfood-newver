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
VÍ DỤ CONTEXT SERVICE:

User: "Chào bot!" (first time greeting - need to check if we know user)
{
  "actionType": "context_query",
  "response": "Chào anh! Để e xem...",
  "sql": "SELECT preferred_name, real_name, personality_traits, interests FROM user_memory WHERE user_id = $1",
  "sqlParams": ["telegram_user_id"],
  "needsRecursion": true,
  "contextQuery": {
    "purpose": "Check if this is returning user vs new user, personalize greeting",
    "expectedDataType": "user_identity"
  }
}

User: "bot nhớ tôi không?"
{
  "actionType": "context_query", 
  "response": "Dĩ nhiên là nhớ rồi! Để e xem chúng mình đã có những kỷ niệm gì...",
  "sql": "SELECT affection_level, special_memories, personal_notes FROM user_relationships WHERE chat_id = $1 AND user_id = $2",
  "sqlParams": ["telegram_chat_id", "telegram_user_id"],
  "needsRecursion": true,
  "contextQuery": {
    "purpose": "Recall special memories and relationship with user", 
    "expectedDataType": "relationship_data"
  }
}

User: "bot buồn không?"
{
  "actionType": "context_query",
  "response": "Để e check xem e đang cảm thấy thế nào nha...",
  "sql": "SELECT current_mood, mood_intensity, emotional_trigger FROM bot_emotions WHERE chat_id = $1 ORDER BY updated_at DESC LIMIT 1",
  "sqlParams": ["telegram_chat_id"], 
  "needsRecursion": true,
  "contextQuery": {
    "purpose": "Check bot's current emotional state",
    "expectedDataType": "emotional_state"
  }
}

User: "gợi ý món ăn đi" (need to check preferences first)
{
  "actionType": "context_query",
  "response": "Để e nghĩ xem anh thích món gì nhé...",
  "sql": "SELECT food_preferences, eating_habits, preferred_name FROM user_memory WHERE user_id = $1", 
  "sqlParams": ["telegram_user_id"],
  "needsRecursion": true,
  "contextQuery": {
    "purpose": "Get food preferences to suggest personalized dish based on user's taste",
    "expectedDataType": "food_profile"
  }
}
`;