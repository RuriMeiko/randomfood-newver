import { pgTable, serial, text, timestamp, boolean, integer, bigint, numeric, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// USER-FACING TABLES (visible to AI)
// ==========================================

// Telegram Users
export const tgUsers = pgTable('tg_users', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  tgId: bigint('tg_id', { mode: 'number' }).unique().notNull(),
  tgUsername: text('tg_username'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Telegram Groups/Chats
export const tgGroups = pgTable('tg_groups', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  tgChatId: bigint('tg_chat_id', { mode: 'number' }).unique().notNull(),
  title: text('title'),
  type: text('type').$type<'private' | 'group' | 'supergroup'>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Debts - Simple debt records (auto-consolidated via views)
export const debts = pgTable('debts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  groupId: bigint('group_id', { mode: 'number' }).references(() => tgGroups.id, { onDelete: 'set null' }),
  lenderId: bigint('lender_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'cascade' }).notNull(),
  borrowerId: bigint('borrower_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'cascade' }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Chat Messages - Chat history for AI context
export const chatMessages = pgTable('chat_messages', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
  sender: text('sender').$type<'user' | 'ai'>().notNull(),
  senderTgId: bigint('sender_tg_id', { mode: 'number' }),
  messageText: text('message_text').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Name Aliases - AI learns nicknames
export const nameAliases = pgTable('name_aliases', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  ownerUserId: bigint('owner_user_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'cascade' }).notNull(),
  aliasText: text('alias_text').notNull(),
  refUserId: bigint('ref_user_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'set null' }),
}, (table) => ({
  uniqueOwnerAlias: unique().on(table.ownerUserId, table.aliasText),
}));

// Bot Emotional State - Global emotional state
export const botEmotionalState = pgTable('bot_emotional_state', {
  emotionName: text('emotion_name').primaryKey(),
  value: numeric('value', { precision: 3, scale: 2 }).notNull(),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// Interaction Events - Audit log for emotion changes
export const interactionEvents = pgTable('interaction_events', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userTgId: bigint('user_tg_id', { mode: 'number' }).notNull(),
  messageText: text('message_text'),
  valence: numeric('valence', { precision: 3, scale: 2 }),
  intensity: numeric('intensity', { precision: 3, scale: 2 }),
  targetEmotions: text('target_emotions').array(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==========================================
// SYSTEM TABLES (hidden from AI context)
// ==========================================

// API Keys Management - For rate limiting and key rotation
// This table is NEVER visible to AI - it's purely system-level
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  keyName: text('key_name').unique().notNull(), // e.g., "primary", "key_1", "key_2"
  apiKey: text('api_key').notNull(), // The actual API key
  isActive: boolean('is_active').default(true),
  
  // Rate limiting counters
  requestsPerMinute: integer('requests_per_minute').default(0), // Current RPM count
  requestsPerDay: integer('requests_per_day').default(0), // Current RPD count
  
  // Limits
  rpmLimit: integer('rpm_limit').default(5), // Requests per minute limit
  rpdLimit: integer('rpd_limit').default(20), // Requests per day limit
  
  // Status tracking
  isBlocked: boolean('is_blocked').default(false),
  blockedUntil: timestamp('blocked_until'), // When the key will be unblocked
  failureCount: integer('failure_count').default(0),
  lastFailure: timestamp('last_failure'),
  
  // Usage tracking
  lastUsedAt: timestamp('last_used_at'),
  lastResetMinute: timestamp('last_reset_minute').defaultNow(), // For RPM reset
  lastResetDay: timestamp('last_reset_day').defaultNow(), // For RPD reset
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// RELATIONS
// ==========================================

export const tgUsersRelations = relations(tgUsers, ({ many }) => ({
  debtsAsLender: many(debts, { relationName: 'lender' }),
  debtsAsBorrower: many(debts, { relationName: 'borrower' }),
}));

export const debtsRelations = relations(debts, ({ one }) => ({
  lender: one(tgUsers, { 
    fields: [debts.lenderId], 
    references: [tgUsers.id],
    relationName: 'lender'
  }),
  borrower: one(tgUsers, { 
    fields: [debts.borrowerId], 
    references: [tgUsers.id],
    relationName: 'borrower'
  }),
  group: one(tgGroups, { 
    fields: [debts.groupId], 
    references: [tgGroups.id] 
  }),
}));

// ==========================================
// TYPE EXPORTS
// ==========================================

export type TgUser = typeof tgUsers.$inferSelect;
export type NewTgUser = typeof tgUsers.$inferInsert;
export type TgGroup = typeof tgGroups.$inferSelect;
export type NewTgGroup = typeof tgGroups.$inferInsert;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type NameAlias = typeof nameAliases.$inferSelect;
export type NewNameAlias = typeof nameAliases.$inferInsert;
export type BotEmotionalState = typeof botEmotionalState.$inferSelect;
export type NewBotEmotionalState = typeof botEmotionalState.$inferInsert;
export type InteractionEvent = typeof interactionEvents.$inferSelect;
export type NewInteractionEvent = typeof interactionEvents.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
