import { pgTable, text, integer, timestamp, boolean, serial, jsonb } from 'drizzle-orm/pg-core';

// Main food table
export const mainfood = pgTable('mainfood', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  img: text('img').notNull(),
  only: boolean('only').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Sub food table
export const subfood = pgTable('subfood', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// History food table
export const historyfood = pgTable('historyfood', {
  id: serial('id').primaryKey(),
  userid: text('userid').notNull(),
  food: integer('food').references(() => mainfood.id),
  subfood: integer('subfood').references(() => subfood.id),
  randomAt: timestamp('random_at').defaultNow(),
});

// Command table for tracking user commands
export const command = pgTable('command', {
  id: text('id').primaryKey(), // chat_id as string
  messageId: integer('message_id'),
  command: text('command'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Credit table
export const credit = pgTable('credit', {
  id: serial('id').primaryKey(),
  data: jsonb('data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tag table for storing tagged users
export const tag = pgTable('tag', {
  id: text('id').primaryKey(), // chat_id as string
  listtag: jsonb('listtag'), // Array of tagged user objects
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Debt table for tracking debts between users
export const debt = pgTable('debt', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  fromUserId: text('from_user_id').notNull(),
  toUserId: text('to_user_id').notNull(),
  amount: integer('amount').notNull(),
  description: text('description'),
  isPaid: boolean('is_paid').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  paidAt: timestamp('paid_at'),
});

export type MainFood = typeof mainfood.$inferSelect;
export type NewMainFood = typeof mainfood.$inferInsert;
export type SubFood = typeof subfood.$inferSelect;
export type NewSubFood = typeof subfood.$inferInsert;
export type HistoryFood = typeof historyfood.$inferSelect;
export type NewHistoryFood = typeof historyfood.$inferInsert;
export type Command = typeof command.$inferSelect;
export type NewCommand = typeof command.$inferInsert;
export type Credit = typeof credit.$inferSelect;
export type NewCredit = typeof credit.$inferInsert;
export type Tag = typeof tag.$inferSelect;
export type NewTag = typeof tag.$inferInsert;
export type Debt = typeof debt.$inferSelect;
export type NewDebt = typeof debt.$inferInsert;