import { pgTable, text, timestamp, serial } from 'drizzle-orm/pg-core';

// Chat history table - lưu lịch sử chat với AI
export const chatHistory = pgTable('chat_history', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(), // ID của chat/group
  userId: text('user_id').notNull(), // ID của user
  username: text('username'), // Tên user
  messageType: text('message_type').notNull(), // 'user' hoặc 'ai'
  content: text('content').notNull(), // Nội dung tin nhắn
  createdAt: timestamp('created_at').defaultNow(),
});

// Bot personality table - lưu system prompt và tính cách
export const botPersonality = pgTable('bot_personality', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull().unique(), // Mỗi chat có 1 personality riêng
  systemPrompt: text('system_prompt').notNull(), // System prompt chính
  personalityTraits: text('personality_traits'), // Mô tả tính cách
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type ChatHistory = typeof chatHistory.$inferSelect;
export type NewChatHistory = typeof chatHistory.$inferInsert;
export type BotPersonality = typeof botPersonality.$inferSelect;
export type NewBotPersonality = typeof botPersonality.$inferInsert;