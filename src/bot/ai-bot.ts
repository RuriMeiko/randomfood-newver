import type { BotConfig } from './types';
import type NeonDB from '@/db/neon';
import { ModernTelegramBot } from '@/telegram/modern-client';
import { createAICommands } from '@/commands/ai/smart-commands';
import { AIBotService } from '@/services/ai-bot.service';
import { MessageSenderService, type TelegramAPI } from '@/services/message-sender.service';
import { log } from '@/utils/logger';

export interface AIBotConfig {
  database: NeonDB;
  telegramToken: string;
  geminiApiKey: string;
}

export class AIFoodDebtBot {
  private modernBot: ModernTelegramBot;
  private database: NeonDB;
  private aiBotService: AIBotService;
  private messageSender: MessageSenderService;
  private token: string;

  constructor(config: AIBotConfig) {
    this.database = config.database;
    this.token = config.telegramToken;
    this.modernBot = new ModernTelegramBot(config.telegramToken);
    
    // Create Telegram API wrapper for message sender
    const telegramAPI: TelegramAPI = {
      sendMessage: async (chatId: string, text: string) => {
        return await this.modernBot.getApi().sendMessage({
          chat_id: parseInt(chatId),
          text: text
        });
      },
      sendChatAction: async (chatId: string, action: string) => {
        return await this.modernBot.getApi().sendChatAction(parseInt(chatId), action);
      }
    };
    
    // Initialize message sender service
    this.messageSender = new MessageSenderService(telegramAPI);
    
    // Pass Telegram API to AIBotService for memory functionality
    this.aiBotService = new AIBotService(
      config.database, 
      config.geminiApiKey
    );

    // Register commands
    this.registerCommands();
    
    log.info('AI Food & Debt Bot initialized', { 
      commandCount: this.modernBot.getCommands().length 
    });
  }

  private registerCommands(): void {
    // Register AI-powered commands
    const aiCommands = createAICommands(this.aiBotService);
    this.modernBot.registerCommands(aiCommands);

    // Set smart default handler for all messages
    this.modernBot.setDefaultHandler(async (ctx) => {
      if (ctx.update_type === 'message' && ctx.text && !ctx.text.startsWith('/')) {
        // Check if should respond (private chat, mentioned in group, or reply to bot)
        const isPrivateChat = ctx.isPrivateChat();
        const isMentioned = this.isBotMentioned(ctx.text);
        const isReplyToBot = ctx.isReplyToBot();
        
        if (isPrivateChat || isMentioned || isReplyToBot) {
          const userId = ctx.user_id?.toString();
          const chatId = ctx.chat_id?.toString();
          const user = ctx.getUser();
          
          if (userId && chatId) {
            // Clean mention from text if present
            const cleanText = this.cleanMentionFromText(ctx.text);
            
            // Show typing indicator instead of sending message
            await ctx.sendTypingAction();
            
            try {
              const startTime = Date.now();
              
              // Prepare reply context if this is a reply to bot
              const replyContext = isReplyToBot ? {
                isReply: true,
                originalMessage: ctx.getRepliedMessage()?.text || '',
                originalMessageId: ctx.getRepliedMessage()?.message_id,
                originalDate: ctx.getRepliedMessage()?.date
              } : undefined;

              // Process with AI
              const result = await this.aiBotService.processUserMessage(
                cleanText,
                userId,
                chatId,
                user?.username,
                user?.first_name,
                user?.last_name,
                undefined, // telegramMessage (not used currently)
                replyContext
              );
              
              const processingTime = Date.now() - startTime;
              
              if (result.success) {
                // Use MessageSenderService to handle natural message sending
                log.debug('Sending AI response with MessageSenderService', {
                  userId, chatId,
                  actionType: result.actionType,
                  responseLength: result.response?.length || 0,
                  hasMessageConfig: !!result.messageConfig,
                  shouldSplit: result.messageConfig?.shouldSplit || false
                });

                // Validate response before sending
                const responseText = result.response && result.response.trim().length > 0 
                  ? result.response 
                  : 'uh, tui k hiểu bà nói gì';

                log.debug('Sending response', {
                  userId, chatId,
                  hasResponse: !!result.response,
                  responseLength: result.response?.length || 0,
                  finalText: responseText.substring(0, 50)
                });

                await this.messageSender.sendResponse(
                  chatId,
                  responseText,
                  result.messageConfig
                );
              } else {
                // Send error message as single message
                await ctx.sendMessage(result.response || 'lỗi r bà ơi, thử lại đi');
              }

              log.user.action('ai_message_processed', userId, {
                chatId,
                actionType: result.actionType,
                success: result.success,
                processingTime,
                textLength: cleanText.length
              });

            } catch (error: any) {
              log.error('Error processing AI message', error, { userId, chatId });
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

    log.info('AI commands registered', { 
      count: this.modernBot.getCommands().length,
      commands: this.modernBot.getCommands().map(cmd => cmd.name)
    });
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
      'food bot',
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
      /food bot/gi,
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
      log.debug('AI bot handling update', { 
        update_id: update.update_id,
        has_message: !!update.message,
        message_text: update.message?.text?.substring(0, 50),
        from_user: update.message?.from?.username
      });

      return await this.modernBot.handleUpdate(update);
    } catch (error: any) {
      log.error('Error in AI bot update handler', error, {
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
}