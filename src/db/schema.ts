import { pgTable, text, timestamp, serial, integer, boolean, decimal } from 'drizzle-orm/pg-core';

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

// AI conversations log for debugging and improvements
export const aiConversations = pgTable('ai_conversations', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(),
  userMessage: text('user_message').notNull(),
  aiResponse: text('ai_response').notNull(),
  actionType: text('action_type'), // 'food_suggestion', 'debt_tracking', 'conversation'
  processingTime: integer('processing_time'), // Response time in ms
  createdAt: timestamp('created_at').defaultNow(),
});

// Conversation messages table for context management
export const conversationMessages = pgTable('conversation_messages', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(),
  messageType: text('message_type').notNull(), // 'user' or 'bot'
  content: text('content').notNull(),
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

// Bot memory system - lưu ký ức về users
export const botMemories = pgTable('bot_memories', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name'), // Tên thật của user
  nickName: text('nick_name'), // Biệt danh
  personalInfo: text('personal_info'), // Thông tin cá nhân (sở thích, công việc...)
  relationshipLevel: text('relationship_level').default('stranger'), // stranger, acquaintance, friend, close_friend
  importantEvents: text('important_events'), // Sự kiện quan trọng
  preferences: text('preferences'), // Sở thích ăn uống, tính cách
  lastInteraction: timestamp('last_interaction').defaultNow(),
  interactionCount: integer('interaction_count').default(1),
  trustLevel: integer('trust_level').default(50), // 0-100
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Bot mood system - tâm trạng bot
export const botMoods = pgTable('bot_moods', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  currentMood: text('current_mood').notNull(), // happy, sad, excited, angry, neutral, playful, tired, etc.
  moodLevel: integer('mood_level').default(50), // 0-100 intensity
  moodReason: text('mood_reason'), // Lý do tâm trạng
  moodTrigger: text('mood_trigger'), // user_interaction, random_event, memory_trigger
  responseStyle: text('response_style'), // short, long, playful, serious, minimal
  lastMoodChange: timestamp('last_mood_change').defaultNow(),
  moodDuration: integer('mood_duration').default(60), // minutes
  isActive: boolean('is_active').default(true),
});

// Debt tracking với độ chính xác cao
export const debtRecords = pgTable('debt_records', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  debtorUserId: text('debtor_user_id').notNull(),
  debtorName: text('debtor_name').notNull(),
  creditorUserId: text('creditor_user_id').notNull(),
  creditorName: text('creditor_name').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('VND'),
  description: text('description'),
  createdDate: timestamp('created_date').defaultNow(),
  dueDate: timestamp('due_date'),
  isPaid: boolean('is_paid').default(false),
  paidDate: timestamp('paid_date'),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }),
  witnesses: text('witnesses'), // JSON array of user IDs who witnessed
  aiConfidence: integer('ai_confidence').default(90), // AI confidence level
  status: text('status').default('active'), // active, paid, disputed, cancelled
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type FoodSuggestion = typeof foodSuggestions.$inferSelect;
export type NewFoodSuggestion = typeof foodSuggestions.$inferInsert;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type ChatMember = typeof chatMembers.$inferSelect;
export type NewChatMember = typeof chatMembers.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type ConversationSummary = typeof conversationSummaries.$inferSelect;
export type NewConversationSummary = typeof conversationSummaries.$inferInsert;
export type BotMemory = typeof botMemories.$inferSelect;
export type NewBotMemory = typeof botMemories.$inferInsert;
export type BotMood = typeof botMoods.$inferSelect;
export type NewBotMood = typeof botMoods.$inferInsert;
export type DebtRecord = typeof debtRecords.$inferSelect;
export type NewDebtRecord = typeof debtRecords.$inferInsert;