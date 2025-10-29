import type { BotConfig } from './types';
import type NeonDB from '@/db/neon';
import { ModernTelegramBot } from '@/telegram/modern-client';
import { createModernBasicCommands } from '@/commands/modern/basic';
import { createModernFoodCommands } from '@/commands/modern/food';
import { createModernSocialCommands, handleHistoryCallback } from '@/commands/modern/social';
import { log } from '@/utils/logger';

export class ModernRandomFoodBot {
  private modernBot: ModernTelegramBot;
  private database: NeonDB;
  private token: string;

  constructor(config: BotConfig) {
    this.database = config.database;
    this.token = config.token;
    this.modernBot = new ModernTelegramBot(config.token);

    // Register all modern commands
    this.registerModernCommands();
    
    log.info('Modern RandomFoodBot initialized', { 
      commandCount: this.modernBot.getCommands().length 
    });
  }

  private registerModernCommands(): void {
    // Register modern commands
    const modernBasicCommands = createModernBasicCommands(this.database);
    const modernFoodCommands = createModernFoodCommands(this.database);
    const modernSocialCommands = createModernSocialCommands(this.database);

    this.modernBot.registerCommands([
      ...modernBasicCommands,
      ...modernFoodCommands, 
      ...modernSocialCommands
    ]);

    // Set default handler for non-command messages and callbacks
    this.modernBot.setDefaultHandler(async (ctx) => {
      if (ctx.update_type === 'callback') {
        await handleHistoryCallback(ctx, this.database);
      } else {
        // Handle other non-command messages if needed
        log.debug('Unhandled message type', { 
          update_type: ctx.update_type, 
          text: ctx.text?.substring(0, 50)
        });
      }
    });

    log.info('Modern commands registered', { 
      count: this.modernBot.getCommands().length,
      commands: this.modernBot.getCommands().map(cmd => cmd.name)
    });
  }

  /**
   * Handle incoming webhook update using modern client
   */
  async handleUpdate(update: any): Promise<Response> {
    try {
      log.debug('Modern bot handling update', { 
        update_id: update.update_id,
        has_message: !!update.message,
        has_callback: !!update.callback_query
      });

      return await this.modernBot.handleUpdate(update);
    } catch (error: any) {
      log.error('Error in modern bot update handler', error, {
        update_id: update.update_id,
        errorMessage: error.message
      });
      return new Response('Error', { status: 500 });
    }
  }

  /**
   * Set webhook URL
   */
  async setWebhook(url: string): Promise<any> {
    return this.modernBot.setWebhook(url);
  }

  /**
   * Get bot information
   */
  async getMe(): Promise<any> {
    return this.modernBot.getMe();
  }

  /**
   * Get list of registered commands
   */
  getCommands(): any[] {
    return this.modernBot.getCommands();
  }

  /**
   * Get database instance
   */
  getDatabase(): NeonDB {
    return this.database;
  }

  /**
   * Get bot token
   */
  getToken(): string {
    return this.token;
  }
}