import type { BotConfig } from './types';
import type NeonDB from '@/db/neon';
import { ModernTelegramBot } from '@/telegram/modern-client';
import { createModernBasicCommands } from '@/commands/modern/basic';
import { createModernFoodCommands } from '@/commands/modern/food';
import { createModernSocialCommands, handleHistoryCallback } from '@/commands/modern/social';
import { createModernDebugCommands } from '@/commands/modern/debug';
import { TelegramValidator } from '@/utils/telegram-validator';
import { log } from '@/utils/logger';

export class ModernRandomFoodBot {
  private modernBot: ModernTelegramBot;
  private database: NeonDB;
  private token: string;

  constructor(config: BotConfig) {
    this.database = config.database;
    this.token = config.telegramToken || config.token;
    this.modernBot = new ModernTelegramBot(this.token);

    // Validate token on initialization
    this.validateToken();

    // Register all modern commands
    this.registerModernCommands();
    
    log.info('Modern RandomFoodBot initialized', { 
      commandCount: this.modernBot.getCommands().length,
      tokenLength: this.token?.length || 0
    });
  }

  /**
   * Validate bot token
   */
  private async validateToken(): Promise<void> {
    try {
      if (!this.token) {
        log.error('Bot token is missing!', undefined, { tokenProvided: false });
        return;
      }

      // Format validation
      const formatValid = TelegramValidator.validateTokenFormat(this.token);
      
      if (formatValid) {
        // API validation (async, don't block initialization)
        TelegramValidator.testBotToken(this.token).then(result => {
          if (result.valid) {
            log.info('✅ Bot token validation successful', { 
              botUsername: result.botInfo?.username,
              botId: result.botInfo?.id
            });
          } else {
            log.error('❌ Bot token API test failed', undefined, { 
              error: result.error 
            });
          }
        }).catch(error => {
          log.error('Token validation error', error);
        });
      }
    } catch (error: any) {
      log.error('Error during token validation', error);
    }
  }

  private registerModernCommands(): void {
    // Register modern commands
    const modernBasicCommands = createModernBasicCommands(this.database);
    const modernFoodCommands = createModernFoodCommands(this.database);
    const modernSocialCommands = createModernSocialCommands(this.database);
    const modernDebugCommands = createModernDebugCommands(this.database, this.token);

    this.modernBot.registerCommands([
      ...modernBasicCommands,
      ...modernFoodCommands, 
      ...modernSocialCommands,
      ...modernDebugCommands
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