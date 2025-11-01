import { ModernTelegramBot } from '@/telegram/modern-client';
import { SimpleAIService } from '@/services/simple-ai.service';
import { log } from '@/utils/logger';

export interface SimpleBotConfig {
  telegramToken: string;
  geminiApiKey: string;
}

export class SimpleChatBot {
  private modernBot: ModernTelegramBot;
  private simpleAI: SimpleAIService;
  private token: string;

  constructor(config: SimpleBotConfig) {
    this.token = config.telegramToken;
    this.modernBot = new ModernTelegramBot(config.telegramToken);
    this.simpleAI = new SimpleAIService(config.geminiApiKey);

    // Setup simple message handler
    this.setupMessageHandler();
    
    log.info('Simple Chat Bot initialized');
  }

  private setupMessageHandler(): void {
    // Set simple default handler for all messages
    this.modernBot.setDefaultHandler(async (ctx) => {
      if (ctx.update_type === 'message' && ctx.text && !ctx.text.startsWith('/')) {
        // Check if should respond (private chat, mentioned in group, or reply to bot)
        const isPrivateChat = ctx.isPrivateChat();
        const isMentioned = this.isBotMentioned(ctx.text);
        const isReplyToBot = ctx.isReplyToBot();
        
        if (isPrivateChat || isMentioned || isReplyToBot) {
          const userId = ctx.user_id?.toString();
          const user = ctx.getUser();
          
          if (userId) {
            // Clean mention from text if present
            const cleanText = this.cleanMentionFromText(ctx.text);
            
            // Show typing indicator
            await ctx.sendTypingAction();
            
            try {
              const startTime = Date.now();
              
              // Process with Simple AI
              const result = await this.simpleAI.processMessage(
                cleanText,
                userId,
                user?.username
              );
              
              const processingTime = Date.now() - startTime;
              
              if (result.success && result.response) {
                // Send simple response
                await ctx.sendMessage(result.response);
                
                log.user.action('simple_ai_message_processed', userId, {
                  success: result.success,
                  processingTime,
                  textLength: cleanText.length
                });
              } else {
                // Send error message
                await ctx.sendMessage(result.response || 'lỗi r bà ơi, thử lại đi');
              }

            } catch (error: any) {
              log.error('Error processing simple AI message', error, { userId });
              await ctx.sendMessage('Xin lỗi, có lỗi xảy ra. Bạn thử hỏi lại nhé!');
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

    log.info('Simple message handler setup completed');
  }

  /**
   * Check if bot is mentioned in the message
   */
  private isBotMentioned(text: string): boolean {
    const botMentions = [
      '@randomfoodruribot',
      '@RandomFoodRuriBot', 
      'randomfoodruribot',
      'random food',
      'bot',
      'ai'
    ];
    
    const lowerText = text.toLowerCase();
    return botMentions.some(mention => lowerText.includes(mention.toLowerCase()));
  }

  /**
   * Clean bot mention from text
   */
  private cleanMentionFromText(text: string): string {
    let cleanText = text;
    
    const mentionPatterns = [
      /@randomfoodruribot/gi,
      /@RandomFoodRuriBot/gi,
      /randomfoodruribot/gi,
      /random food bot/gi,
      /bot/gi,
      /@\w+/g // Remove any @mentions
    ];
    
    mentionPatterns.forEach(pattern => {
      cleanText = cleanText.replace(pattern, '');
    });
    
    return cleanText.trim().replace(/\s+/g, ' ');
  }

  /**
   * Handle incoming webhook update
   */
  async handleUpdate(update: any): Promise<Response> {
    try {
      log.debug('Simple bot handling update', { 
        update_id: update.update_id,
        has_message: !!update.message,
        message_text: update.message?.text?.substring(0, 50),
        from_user: update.message?.from?.username
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
}