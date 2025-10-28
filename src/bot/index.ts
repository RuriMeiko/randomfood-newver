import type { BotConfig, BotContext, Message, CallbackQuery } from '@/bot/types';
import { TelegramClient } from '@/telegram/client';
import { BotCommandRegistry } from '@/commands/registry';
import { createBasicCommands } from '@/commands/basic';
import { createFoodCommands } from '@/commands/food';
import { createSocialCommands } from '@/commands/social';
import type NeonDB from '@/db/neon';
import * as utils from '@/utils';
import { log, LogLevel, logger } from '@/utils/logger';

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
    
    // Setup logging
    logger.setContext('RandomFoodBot');
    logger.setLogLevel(LogLevel.INFO);
    log.info('Bot initialized', { userBot: this.userBot });
    
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
      
      log.info('Received message', {
        chatId: message.chat.id,
        userId: message.from?.id,
        hasText: !!message.text,
        messageId: message.message_id
      });
      
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
      
      log.debug('Message handled successfully');
      return utils.toJSON('OK');
    } catch (error: any) {
      log.error('Error handling message', error, {
        messageId: request.content?.message?.message_id,
        chatId: request.content?.message?.chat?.id
      });
      return utils.toError(error.message);
    }
  }

  async handleCallback(request: any): Promise<Response> {
    try {
      const callbackQuery: CallbackQuery = request.content.callback_query;
      
      log.info('Received callback query', {
        callbackId: callbackQuery.id,
        data: callbackQuery.data,
        chatId: callbackQuery.message.chat.id,
        messageId: callbackQuery.message.message_id
      });
      
      const context: BotContext = {
        chatId: callbackQuery.message.chat.id.toString(),
        userId: callbackQuery.message.chat.id.toString(),
        messageId: callbackQuery.message.message_id,
        threadId: callbackQuery.message.message_thread_id,
        isCallback: true
      };

      await this.processCallback(callbackQuery, context);
      await this.telegramClient.answerCallbackQuery(callbackQuery.id);
      
      log.debug('Callback handled successfully');
      return utils.toJSON('OK');
    } catch (error: any) {
      log.error('Error handling callback', error, {
        callbackId: request.content?.callback_query?.id,
        data: request.content?.callback_query?.data
      });
      return utils.toError(error.message);
    }
  }

  private async processTextMessage(message: Message, context: BotContext): Promise<void> {
    const startTime = Date.now();
    let command = this.extractCommand(message.text!);
    const args = this.extractArgs(message.text!, command);
    
    // Handle bot mention
    if (command.endsWith(`@${this.userBot}`)) {
      command = command.replace(`@${this.userBot}`, '');
    }

    log.debug('Processing text message', {
      command,
      args: args.substring(0, 100), // Limit args length for logging
      chatId: context.chatId,
      userId: context.userId
    });

    const commandHandler = this.commandRegistry.get(command);
    
    if (commandHandler) {
      try {
        // Clear any pending command state
        await this.clearCommandState(context.chatId);
        
        log.info(`Executing command: ${command}`, {
          userId: context.userId,
          chatId: context.chatId
        });
        
        // Execute command
        await commandHandler.execute(context, args, this.telegramClient);
        
        const duration = Date.now() - startTime;
        log.command.executed(command, context.userId, true, duration);
        
      } catch (error: any) {
        const duration = Date.now() - startTime;
        log.command.executed(command, context.userId, false, duration);
        log.error(`Command execution failed: ${command}`, error, {
          userId: context.userId,
          chatId: context.chatId,
          args
        });
        throw error; // Re-throw to be handled by parent
      }
    } else {
      log.debug('Non-command text received', {
        text: message.text?.substring(0, 50),
        userId: context.userId
      });
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
      log.db.query('deleteOne', 'command', { chatId });
      await this.database
        .collection('command')
        .deleteOne({ filter: { id: chatId } });
    } catch (error: any) {
      log.db.error('deleteOne', 'command', error, { chatId });
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