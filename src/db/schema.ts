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