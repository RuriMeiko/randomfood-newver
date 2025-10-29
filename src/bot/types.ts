import type NeonDB from '@/db/neon';

export interface BotConfig {
  token: string;
  userBot: string;
  database: NeonDB;
}

export interface BotContext {
  chatId: string;
  userId: string;
  messageId?: number;
  threadId?: number;
  isCallback?: boolean;
}

export interface CommandHandler {
  name: string;
  description: string;
  execute: (context: BotContext, args: string, bot: TelegramBot) => Promise<void>;
}

export interface ModernCommand {
  name: string;
  description: string;
  adminOnly?: boolean;
  execute(ctx: import('@/telegram/context').TelegramExecutionContext, args: string[]): Promise<any>;
}

export interface TelegramBot {
  sendMessage(text: string, chatId: string, threadId?: number, keyboard?: any): Promise<any>;
  sendPhoto(photoUrl: string, chatId: string, caption?: string, threadId?: number): Promise<any>;
  sendSticker(stickerId: string, chatId: string, threadId?: number): Promise<any>;
  editMessage(text: string, chatId: string, messageId: number, keyboard?: any): Promise<any>;
  answerCallbackQuery(callbackId: string, text?: string): Promise<any>;
}

export interface Message {
  chat: { id: number };
  from: { id: number; first_name: string; last_name?: string; username?: string };
  text?: string;
  message_id: number;
  message_thread_id?: number;
  entities?: any[];
}

export interface CallbackQuery {
  id: string;
  data: string;
  message: Message;
}