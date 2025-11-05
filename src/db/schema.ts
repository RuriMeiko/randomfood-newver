import { pgTable, serial, text, timestamp, boolean, integer, bigint, numeric, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Telegram Users
export const tgUsers = pgTable('tg_users', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  tgId: bigint('tg_id', { mode: 'number' }).unique().notNull(),
  tgUsername: text('tg_username'),
  displayName: text('display_name'),
  realName: text('real_name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Telegram Groups/Chats
export const tgGroups = pgTable('tg_groups', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  tgChatId: bigint('tg_chat_id', { mode: 'number' }).unique().notNull(),
  title: text('title'),
  type: text('type').$type<'private' | 'group' | 'supergroup'>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Group Members
export const tgGroupMembers = pgTable('tg_group_members', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  groupId: bigint('group_id', { mode: 'number' }).references(() => tgGroups.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').defaultNow(),
  nicknameInGroup: text('nickname_in_group'),
  lastSeen: timestamp('last_seen').defaultNow(),
}, (table) => ({
  uniqueGroupUser: unique().on(table.groupId, table.userId),
}));

// Debts
export const debts = pgTable('debts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  groupId: bigint('group_id', { mode: 'number' }).references(() => tgGroups.id, { onDelete: 'set null' }),
  lenderId: bigint('lender_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'cascade' }).notNull(),
  borrowerId: bigint('borrower_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'cascade' }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').default('VND'),
  note: text('note'),
  occurredAt: timestamp('occurred_at').defaultNow(),
  settled: boolean('settled').default(false),
});

// Payments
export const payments = pgTable('payments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  debtId: bigint('debt_id', { mode: 'number' }).references(() => debts.id, { onDelete: 'cascade' }),
  payerId: bigint('payer_id', { mode: 'number' }).references(() => tgUsers.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at').defaultNow(),
  note: text('note'),
});

// Chat Sessions
export const chatSessions = pgTable('chat_sessions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  groupId: bigint('group_id', { mode: 'number' }).references(() => tgGroups.id, { onDelete: 'set null' }),
  userId: bigint('user_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').defaultNow(),
  lastActivity: timestamp('last_activity').defaultNow(),
  contextHash: text('context_hash'),
  active: boolean('active').default(true),
});

// Chat Messages
export const chatMessages = pgTable('chat_messages', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  sessionId: bigint('session_id', { mode: 'number' }).references(() => chatSessions.id, { onDelete: 'cascade' }),
  sender: text('sender').$type<'user' | 'ai'>().notNull(),
  senderTgId: bigint('sender_tg_id', { mode: 'number' }),
  messageText: text('message_text').notNull(),
  delayMs: integer('delay_ms'),
  intent: text('intent'),
  sqlQuery: text('sql_query'),
  sqlParams: jsonb('sql_params'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Name Aliases - ánh xạ tên tự nhiên -> user_id
export const nameAliases = pgTable('name_aliases', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  ownerUserId: bigint('owner_user_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'cascade' }).notNull(),
  aliasText: text('alias_text').notNull(),
  refUserId: bigint('ref_user_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'set null' }),
  confidence: numeric('confidence', { precision: 3, scale: 2 }).default('0'),
  lastUsed: timestamp('last_used').defaultNow(),
}, (table) => ({
  uniqueOwnerAlias: unique().on(table.ownerUserId, table.aliasText),
}));

// Food Items
export const foodItems = pgTable('food_items', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  region: text('region'),
  imageUrl: text('image_url'),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Food Suggestions
export const foodSuggestions = pgTable('food_suggestions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).references(() => tgUsers.id, { onDelete: 'cascade' }),
  groupId: bigint('group_id', { mode: 'number' }).references(() => tgGroups.id, { onDelete: 'set null' }),
  foodId: bigint('food_id', { mode: 'number' }).references(() => foodItems.id, { onDelete: 'set null' }),
  query: text('query'),
  aiResponse: text('ai_response'),
  suggestedAt: timestamp('suggested_at').defaultNow(),
});

// Action Logs
export const actionLogs = pgTable('action_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).references(() => tgUsers.id),
  groupId: bigint('group_id', { mode: 'number' }).references(() => tgGroups.id),
  actionType: text('action_type'),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Pending Confirmations - for two-party confirmations on debt operations
export const pendingConfirmations = pgTable('pending_confirmations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  debtId: bigint('debt_id', { mode: 'number' }).references(() => debts.id, { onDelete: 'cascade' }).notNull(),
  actionType: text('action_type').notNull(), // 'debt_completion', 'debt_deletion', etc.
  requestedBy: bigint('requested_by', { mode: 'number' }).references(() => tgUsers.id).notNull(),
  lenderConfirmed: boolean('lender_confirmed').default(false),
  borrowerConfirmed: boolean('borrower_confirmed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // auto-expire after some time
});

// Relations
export const tgUsersRelations = relations(tgUsers, ({ many }) => ({
  groupMemberships: many(tgGroupMembers),
  debtsAsLender: many(debts, { relationName: 'lender' }),
  debtsAsBorrower: many(debts, { relationName: 'borrower' }),
  payments: many(payments),
  nameAliases: many(nameAliases, { relationName: 'owner' }),
  aliasReferences: many(nameAliases, { relationName: 'reference' }),
}));

export const tgGroupsRelations = relations(tgGroups, ({ many }) => ({
  members: many(tgGroupMembers),
  debts: many(debts),
  chatSessions: many(chatSessions),
}));

export const debtsRelations = relations(debts, ({ one, many }) => ({
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
  payments: many(payments),
}));

// Type exports
export type TgUser = typeof tgUsers.$inferSelect;
export type NewTgUser = typeof tgUsers.$inferInsert;
export type TgGroup = typeof tgGroups.$inferSelect;
export type NewTgGroup = typeof tgGroups.$inferInsert;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type NameAlias = typeof nameAliases.$inferSelect;
export type NewNameAlias = typeof nameAliases.$inferInsert;
export type PendingConfirmation = typeof pendingConfirmations.$inferSelect;
export type NewPendingConfirmation = typeof pendingConfirmations.$inferInsert;