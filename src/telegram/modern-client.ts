import TelegramApi from './api';
import { TelegramExecutionContext } from './context';
import { log } from '@/utils/logger';
import type { ModernCommand } from '@/bot/types';

/** Modern Telegram bot client based on cf-workers-telegram-bot */
export class ModernTelegramBot {
  private api: TelegramApi;
  private commands: Map<string, ModernCommand> = new Map();
  private defaultHandler?: (ctx: TelegramExecutionContext) => Promise<any>;

  constructor(private token: string) {
    this.api = new TelegramApi(token);
  }

  /**
   * Register a command handler
   */
  registerCommand(command: ModernCommand): void {
    this.commands.set(command.name, command);
    log.info(`Registered command: /${command.name}`, { description: command.description });
  }

  /**
   * Register multiple commands at once
   */
  registerCommands(commands: ModernCommand[]): void {
    commands.forEach(cmd => this.registerCommand(cmd));
  }

  /**
   * Set default handler for non-command messages
   */
  setDefaultHandler(handler: (ctx: TelegramExecutionContext) => Promise<any>): void {
    this.defaultHandler = handler;
  }

  /**
   * Handle incoming webhook update
   */
  async handleUpdate(update: any): Promise<Response> {
    try {
      log.debug('Processing Telegram update', { update_id: update.update_id, update_type: this.getUpdateType(update) });

      const ctx = new TelegramExecutionContext(this.api, update);

      // Check if it's a command
      if (ctx.text?.startsWith('/')) {
        const { command, args } = ctx.getCommand();

        if (this.commands.has(command)) {
          const commandHandler = this.commands.get(command)!;

          // Check admin permissions
          if (commandHandler.adminOnly && !this.isAdmin(ctx)) {
            await ctx.sendMessage('❌ This command requires admin privileges.');
            return new Response('OK');
          }

          log.info(`Executing command: /${command}`, {
            userId: ctx.user_id,
            chatId: ctx.chat_id,
            args: args.length
          });

          await commandHandler.execute(ctx, args);
        } else {
          log.warn(`Unknown command: /${command}`, { userId: ctx.user_id, chatId: ctx.chat_id });
          await ctx.sendMessage(`❓ Unknown command: /${command}\nUse /help to see available commands.`);
        }
      } else {
        // Handle non-command messages
        if (this.defaultHandler) {
          await this.defaultHandler(ctx);
        } else {
          log.debug('No handler for non-command message', { text: ctx.text?.substring(0, 50) });
        }
      }

      return new Response('OK');
    } catch (error: any) {
      log.error('Error handling Telegram update', error, {
        update_id: update.update_id,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return new Response('Error', { status: 500 });
    }
  }

  /**
   * Get the type of update for logging
   */
  private getUpdateType(update: any): string {
    if (update.message) return 'message';
    if (update.callback_query) return 'callback_query';
    if (update.inline_query) return 'inline_query';
    if (update.business_message) return 'business_message';
    return 'unknown';
  }

  /**
   * Check if user is admin (placeholder - implement based on your needs)
   */
  private isAdmin(ctx: TelegramExecutionContext): boolean {
    // You can implement your admin check logic here
    // For example, check against a list of admin user IDs
    const adminIds = ['123456789']; // Replace with actual admin IDs
    return adminIds.includes(ctx.user_id?.toString() || '');
  }

  /**
   * Get bot information
   */
  async getMe(): Promise<any> {
    return this.api.getMe();
  }

  /**
   * Set webhook URL
   */
  async setWebhook(url: string): Promise<any> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result: any = await response.json();
      log.info('Webhook set', { url, success: result.ok });
      return result;
    } catch (error: any) {
      log.error('Error setting webhook', error, { url });
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get list of registered commands
   */
  getCommands(): ModernCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get Telegram API instance for memory service
   */
  getApi(): any {
    return this.api;
  }
}