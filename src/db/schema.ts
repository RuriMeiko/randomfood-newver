import { pgTable, text, timestamp, serial, integer, boolean, decimal, real, json } from 'drizzle-orm/pg-core';

// Food suggestions history table
export const foodSuggestions = pgTable('food_suggestions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  chatId: text('chat_id').notNull(),
  username: text('username'), // Telegram username
  suggestion: text('suggestion').notNull(), // Gemini generated food suggestion
  prompt: text('prompt'), // User's original request/prompt
  aiResponse: text('ai_response'), // Full AI response for reference
  createdAt: timestamp('created_at').defaultNow(),
});

// Debt tracking table
export const debts = pgTable('debts', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(), // Group chat where debt was created
  debtorUserId: text('debtor_user_id').notNull(), // Who owes money
  debtorUsername: text('debtor_username'), // Debtor's username
  creditorUserId: text('creditor_user_id').notNull(), // Who is owed money
  creditorUsername: text('creditor_username'), // Creditor's username
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), // Amount owed
  currency: text('currency').default('VND'), // Currency (VND, USD, etc.)
  description: text('description'), // What the debt is for
  isPaid: boolean('is_paid').default(false), // Whether debt is settled
  createdAt: timestamp('created_at').defaultNow(),
  paidAt: timestamp('paid_at'), // When debt was marked as paid
  aiDetection: text('ai_detection'), // Original AI analysis of the debt
});

// Chat members table to track users in groups
export const chatMembers = pgTable('chat_members', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(),
  username: text('username'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  isActive: boolean('is_active').default(true), // Still in the group
  lastSeen: timestamp('last_seen').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// REMOVED: ai_conversations table - now using conversation_messages with recursive AI queries

// Conversation messages table for context management with emotional awareness
export const conversationMessages = pgTable('conversation_messages', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(),
  messageType: text('message_type').notNull(), // 'user', 'bot', 'bot_memory', 'emotional_state'
  content: text('content').notNull(),
  emotionalContext: json('emotional_context'), // Bot's emotional state when sending/receiving
  sentimentScore: real('sentiment_score'), // AI analyzed sentiment of message
  replyToMessageId: integer('reply_to_message_id'), // For reply chain tracking
  interactionType: text('interaction_type'), // 'question', 'response', 'casual', 'emotional', 'memory_share'
  metadata: json('metadata'), // Additional context data
  tokenCount: integer('token_count').default(0),
  timestamp: timestamp('timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Conversation summaries table for context window management
export const conversationSummaries = pgTable('conversation_summaries', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(),
  summary: text('summary').notNull(),
  messageCount: integer('message_count').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  tokenCount: integer('token_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 🧠 User comprehensive memory system  
export const userMemory = pgTable('user_memory', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(), // Unique per user across all chats
  
  // Basic Identity
  realName: text('real_name'), // "Nguyễn Trần Hoàng Long"
  preferredName: text('preferred_name'), // "Long", "Anh Long"
  aliases: json('aliases'), // ["Long ú", "Sobbin", "Long"]
  
  // Personal Information
  personalInfo: json('personal_info'), // {birthday: "15/3", age: 25, job: "developer", location: "HCMC"}
  
  // Food Preferences & Habits
  foodPreferences: json('food_preferences'), // {likes: ["mì tôm", "cơm chiên"], dislikes: ["cay"], allergies: ["tôm"]}
  eatingHabits: json('eating_habits'), // {breakfast_time: "7AM", favorite_restaurants: ["quán A"], budget: "50k"}
  
  // Personality & Characteristics  
  personalityTraits: json('personality_traits'), // {mood: "vui tính", humor: "hay đùa", talking_style: "thân thiện"}
  interests: json('interests'), // ["coding", "game", "music", "travel"]
  
  // Behavioral Patterns
  chatPatterns: json('chat_patterns'), // {active_hours: ["9PM-11PM"], frequency: "daily", topics: ["food", "work"]}
  preferences: json('preferences'), // {notification_style: "gentle", privacy_level: "open"}
  
  // Relationships & Social
  socialConnections: json('social_connections'), // {close_friends: ["An", "Minh"], family: [], groups: ["work", "friends"]}
  communicationStyle: text('communication_style').default('friendly'), // "formal", "casual", "playful", "close"
  
  // Memory Metadata
  memoryQuality: real('memory_quality').default(1.0), // 0.0-1.0 độ tin cậy
  lastUpdated: timestamp('last_updated').defaultNow(),
  createdBy: text('created_by').notNull(), // AI or user ID
  createdAt: timestamp('created_at').defaultNow(),
});

// 💝 Bot emotional state and mood system
export const botEmotions = pgTable('bot_emotions', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  currentMood: text('current_mood').notNull(), // 'vui', 'buồn', 'hứng thú', 'mệt mỏi', 'nghịch ngợm', 'quan tâm'
  moodIntensity: real('mood_intensity').notNull().default(0.5), // 0.0-1.0
  emotionalTrigger: text('emotional_trigger'), // Nguyên nhân thay đổi cảm xúc
  previousMood: text('previous_mood'), // Tâm trạng trước đó
  socialContext: json('social_context'), // {activeUsers: [], topicOfConversation: '', groupEnergy: 'high/medium/low'}
  personalityTraits: json('personality_traits').default('{"playful": 0.7, "caring": 0.8, "sassy": 0.6, "empathetic": 0.9}'),
  lastUserInteraction: text('last_user_interaction'), // User ID cuối tương tác
  emotionalMemory: json('emotional_memory'), // Nhớ reactions với users khác nhau
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 💫 User relationship dynamics với bot
export const userRelationships = pgTable('user_relationships', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(),
  relationshipType: text('relationship_type').default('friendly'), // 'close', 'friendly', 'new', 'protective', 'playful'
  affectionLevel: real('affection_level').default(0.5), // 0.0-1.0 - Bot yêu quý user này bao nhiêu
  trustLevel: real('trust_level').default(0.5), // 0.0-1.0 - Độ tin tưởng
  interactionHistory: json('interaction_history'), // Lịch sử tương tác đặc biệt
  personalNotes: text('personal_notes'), // Bot ghi chú riêng về user này
  specialMemories: json('special_memories'), // Kỷ niệm đặc biệt với user
  communicationStyle: text('communication_style').default('normal'), // 'cute', 'formal', 'playful', 'caring'
  lastInteraction: timestamp('last_interaction').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 🎭 Emotional reactions and expressions
export const emotionalExpressions = pgTable('emotional_expressions', {
  id: serial('id').primaryKey(),
  emotionType: text('emotion_type').notNull(), // 'happy', 'sad', 'excited', 'annoyed', 'caring', 'playful'
  expressions: json('expressions').notNull(), // Array các cách diễn đạt
  contextTags: json('context_tags'), // Khi nào dùng: ['debt_reminder', 'food_suggestion', 'casual_chat']
  intensityLevel: text('intensity_level').notNull(), // 'low', 'medium', 'high'
  personalityAlignment: json('personality_alignment'), // Phù hợp với personality traits nào
  createdAt: timestamp('created_at').defaultNow(),
});

// 📝 Personal memories and experiences bot "tạo ra"
export const botMemories = pgTable('bot_memories', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  memoryType: text('memory_type').notNull(), // 'preference', 'experience', 'observation', 'personal_story'
  memoryContent: text('memory_content').notNull(),
  relatedUsers: json('related_users'), // Users liên quan đến memory này
  emotionalWeight: real('emotional_weight').default(0.5), // Tầm quan trọng cảm xúc
  memoryTags: json('memory_tags'), // Tags để search: ['food', 'friendship', 'funny', 'sad']
  triggerContext: json('trigger_context'), // Ngữ cảnh nào sẽ recall memory này
  confidenceLevel: real('confidence_level').default(1.0), // Bot tin memory này bao nhiêu
  isShared: boolean('is_shared').default(false), // Đã share với users chưa
  createdAt: timestamp('created_at').defaultNow(),
  lastRecalled: timestamp('last_recalled'),
});


export type FoodSuggestion = typeof foodSuggestions.$inferSelect;
export type NewFoodSuggestion = typeof foodSuggestions.$inferInsert;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type ChatMember = typeof chatMembers.$inferSelect;
export type NewChatMember = typeof chatMembers.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type ConversationSummary = typeof conversationSummaries.$inferSelect;
export type NewConversationSummary = typeof conversationSummaries.$inferInsert;
export type UserMemory = typeof userMemory.$inferSelect;
export type NewUserMemory = typeof userMemory.$inferInsert;

// 💝 Emotional Intelligence Types
export type BotEmotion = typeof botEmotions.$inferSelect;
export type NewBotEmotion = typeof botEmotions.$inferInsert;
export type UserRelationship = typeof userRelationships.$inferSelect;
export type NewUserRelationship = typeof userRelationships.$inferInsert;
export type EmotionalExpression = typeof emotionalExpressions.$inferSelect;
export type NewEmotionalExpression = typeof emotionalExpressions.$inferInsert;
export type BotMemory = typeof botMemories.$inferSelect;
export type NewBotMemory = typeof botMemories.$inferInsert;