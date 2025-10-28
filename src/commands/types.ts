import type { BotContext, TelegramBot } from '@/bot/types';

export interface Command {
  name: string;
  description: string;
  execute: (context: BotContext, args: string, bot: TelegramBot) => Promise<void>;
}

export interface CommandRegistry {
  register(command: Command): void;
  get(name: string): Command | undefined;
  getAll(): Command[];
}

export interface FoodItem {
  id: number;
  name: string;
  img: string;
  only?: boolean;
}

export interface HistoryItem {
  id: number;
  userid: string;
  food: number;
  subfood?: number;
  randomAt: Date;
}