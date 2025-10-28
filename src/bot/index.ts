import type { BotConfig, BotContext, Message, CallbackQuery } from '@/bot/types';
import { TelegramClient } from '@/telegram/client';
import { BotCommandRegistry } from '@/commands/registry';
import { createBasicCommands } from '@/commands/basic';
import { createFoodCommands } from '@/commands/food';
import { createSocialCommands } from '@/commands/social';
import type NeonDB from '@/db/neon';
import * as utils from '@/utils';

export class RandomFoodBot {
  private telegramClient: TelegramClient;
  private commandRegistry: BotCommandRegistry;
  private database: NeonDB;
  private userBot: string;

  constructor(config: BotConfig) {
    this.telegramClient = new TelegramClient(config.token);
    this.commandRegistry = new BotCommandRegistry();
    this.database = config.database;
    this.userBot = config.userBot;
    
    this.registerCommands();
  }

  private registerCommands(): void {
    // Register basic commands
    const basicCommands = createBasicCommands(this.database);
    basicCommands.forEach(cmd => this.commandRegistry.register(cmd));
    
    // Register food commands
    const foodCommands = createFoodCommands(this.database);
    foodCommands.forEach(cmd => this.commandRegistry.register(cmd));
    
    // Register social commands
    const socialCommands = createSocialCommands(this.database);
    socialCommands.forEach(cmd => this.commandRegistry.register(cmd));
  }

  async handleMessage(request: any): Promise<Response> {
    try {
      const message: Message = request.content.message;
      
      if (message.text) {
        const context: BotContext = {
          chatId: message.chat.id.toString(),
          userId: message.chat.id.toString(),
          messageId: message.message_id,
          threadId: message.message_thread_id,
          isCallback: false
        };

        await this.processTextMessage(message, context);
      }
      
      return utils.toJSON('OK');
    } catch (error: any) {
      console.error('Error handling message:', error);
      return utils.toError(error.message);
    }
  }

  async handleCallback(request: any): Promise<Response> {
    try {
      const callbackQuery: CallbackQuery = request.content.callback_query;
      
      const context: BotContext = {
        chatId: callbackQuery.message.chat.id.toString(),
        userId: callbackQuery.message.chat.id.toString(),
        messageId: callbackQuery.message.message_id,
        threadId: callbackQuery.message.message_thread_id,
        isCallback: true
      };

      await this.processCallback(callbackQuery, context);
      await this.telegramClient.answerCallbackQuery(callbackQuery.id);
      
      return utils.toJSON('OK');
    } catch (error: any) {
      console.error('Error handling callback:', error);
      return utils.toError(error.message);
    }
  }

  private async processTextMessage(message: Message, context: BotContext): Promise<void> {
    let command = this.extractCommand(message.text!);
    const args = this.extractArgs(message.text!, command);
    
    // Handle bot mention
    if (command.endsWith(`@${this.userBot}`)) {
      command = command.replace(`@${this.userBot}`, '');
    }

    const commandHandler = this.commandRegistry.get(command);
    
    if (commandHandler) {
      // Clear any pending command state
      await this.clearCommandState(context.chatId);
      
      // Execute command
      await commandHandler.execute(context, args, this.telegramClient);
    } else {
      // Handle non-command text (if needed)
      await this.handleNonCommandText(message, context);
    }
  }

  private async processCallback(callbackQuery: CallbackQuery, context: BotContext): Promise<void> {
    const data = callbackQuery.data;
    
    // Handle pagination callbacks
    if (data.startsWith('next_')) {
      const page = parseInt(data.split('_')[1]) || 0;
      const historyCommand = this.commandRegistry.get('/randomfoodhistory');
      
      if (historyCommand) {
        await historyCommand.execute(context, page.toString(), this.telegramClient);
      }
    }
  }

  private extractCommand(text: string): string {
    const parts = text.split(' ');
    return parts[0] || '';
  }

  private extractArgs(text: string, command: string): string {
    return text.slice(command.length).trim();
  }

  private async clearCommandState(chatId: string): Promise<void> {
    try {
      await this.database
        .collection('command')
        .deleteOne({ filter: { id: chatId } });
    } catch (error) {
      // Ignore errors when clearing command state
    }
  }

  private async handleNonCommandText(message: Message, context: BotContext): Promise<void> {
    // Check if user has pending command state
    const currentCommand = await this.database
      .collection('command')
      .findOne({ filter: { id: context.chatId } });
    
    if (currentCommand.document?.command) {
      // Handle pending command logic here
      // For now, just clear the state
      await this.clearCommandState(context.chatId);
    }
  }
}