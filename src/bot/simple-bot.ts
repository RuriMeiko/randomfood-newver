import type { BotConfig } from './types';
import type NeonDB from '@/db/neon';
import { ModernTelegramBot } from '@/telegram/modern-client';
import { createSimpleFoodCommands } from '@/commands/simple/food';
import { SimpleFoodService } from '@/services/simple-food.service';
import { log } from '@/utils/logger';

export interface SimpleBotConfig {
  database: NeonDB;
  telegramToken: string;
  geminiApiKey: string;
}

export class SimpleFoodBot {
  private modernBot: ModernTelegramBot;
  private database: NeonDB;
  private foodService: SimpleFoodService;
  private token: string;

  constructor(config: SimpleBotConfig) {
    this.database = config.database;
    this.token = config.telegramToken;
    this.modernBot = new ModernTelegramBot(config.telegramToken);
    this.foodService = new SimpleFoodService(config.database, config.geminiApiKey);

    // Register commands
    this.registerCommands();
    
    log.info('Simple Food Bot initialized', { 
      commandCount: this.modernBot.getCommands().length 
    });
  }

  private registerCommands(): void {
    // Register simple food commands
    const foodCommands = createSimpleFoodCommands(this.foodService);
    this.modernBot.registerCommands(foodCommands);

    // Set default handler for non-command messages
    this.modernBot.setDefaultHandler(async (ctx) => {
      if (ctx.update_type === 'message' && ctx.text && !ctx.text.startsWith('/')) {
        // Only respond in private chats or when mentioned in groups
        const isPrivateChat = ctx.isPrivateChat();
        const isMentioned = this.isBotMentioned(ctx.text);
        
        if (isPrivateChat || isMentioned) {
          const userId = ctx.user_id?.toString();
          const chatId = ctx.chat_id?.toString();
          
          if (userId && chatId) {
            // Clean mention from text if present
            const cleanText = this.cleanMentionFromText(ctx.text);
            
            await ctx.sendMessage('🤖 Đang tạo gợi ý món ăn cho bạn...');
            
            try {
              const result = await this.foodService.getRandomFoodSuggestion(userId, chatId, cleanText);
              
              if (result.success) {
                let responseText = `🤖 <b>Gợi ý món ăn từ AI:</b>\n\n`;
                responseText += `${result.suggestion}\n\n`;
                responseText += `💭 <i>Dựa trên: "${cleanText}"</i>\n\n`;
                responseText += `🔄 Gửi /food để có gợi ý khác`;
                
                await ctx.editMessage(responseText);
              } else {
                await ctx.editMessage(`❌ Không thể tạo gợi ý: ${result.error}\n\n💡 Thử lại với /food`);
              }
            } catch (error) {
              await ctx.editMessage('❌ Có lỗi xảy ra. Vui lòng thử /food');
            }
          }
        } else {
          // In group chat but not mentioned - do nothing
          log.debug('Group message without mention - ignoring', { 
            chatId: ctx.chat_id,
            text: ctx.text?.substring(0, 50)
          });
        }
      }
    });

    log.info('Simple commands registered', { 
      count: this.modernBot.getCommands().length,
      commands: this.modernBot.getCommands().map(cmd => cmd.name)
    });
  }

  /**
   * Handle incoming webhook update
   */
  async handleUpdate(update: any): Promise<Response> {
    try {
      log.debug('Simple bot handling update', { 
        update_id: update.update_id,
        has_message: !!update.message,
        message_text: update.message?.text?.substring(0, 50)
      });

      return await this.modernBot.handleUpdate(update);
    } catch (error: any) {
      log.error('Error in simple bot update handler', error, {
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
   * Check if bot is mentioned in the message
   */
  private isBotMentioned(text: string): boolean {
    // Check for @bot_username mentions
    const botMentions = [
      '@randomfoodruribot',
      '@RandomFoodRuriBot', 
      'randomfoodruribot',
      'random food',
      'food bot'
    ];
    
    const lowerText = text.toLowerCase();
    return botMentions.some(mention => lowerText.includes(mention.toLowerCase()));
  }

  /**
   * Clean bot mention from text
   */
  private cleanMentionFromText(text: string): string {
    let cleanText = text;
    
    // Remove @bot_username mentions
    const mentionPatterns = [
      /@randomfoodruribot/gi,
      /@RandomFoodRuriBot/gi,
      /randomfoodruribot/gi,
      /random food bot/gi,
      /food bot/gi
    ];
    
    mentionPatterns.forEach(pattern => {
      cleanText = cleanText.replace(pattern, '');
    });
    
    // Clean up extra spaces
    return cleanText.trim().replace(/\s+/g, ' ');
  }
}