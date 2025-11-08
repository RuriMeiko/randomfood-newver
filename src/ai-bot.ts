/**
 * AI Bot - Refactored Version
 * Main orchestrator that coordinates all services
 */

import { DatabaseService } from './services/database';
import { ContextBuilderService } from './services/context-builder';
import { AIAnalyzerService } from './services/ai-analyzer';
import { StickerService } from './services/sticker-service';
import type { TelegramMessage } from './types/telegram';
import type { ProcessMessageResult, AIResponse } from './types/ai-bot';

export class AIBot {
  private _dbService: DatabaseService;
  private _contextBuilder: ContextBuilderService;
  private _aiAnalyzer: AIAnalyzerService;
  private _stickerService: StickerService;

  constructor(apiKey: string, databaseUrl: string) {
    // Initialize services
    this._dbService = new DatabaseService(databaseUrl);
    this._contextBuilder = new ContextBuilderService(this._dbService);
    this._aiAnalyzer = new AIAnalyzerService(apiKey, this._dbService);
    this._stickerService = new StickerService();
  }

  /**
   * Process a message and return a simple text response
   */
  async processMessage(message: TelegramMessage): Promise<string> {
    try {
      console.log('🤖 [AIBot] Processing message:', message.text);

      // 1. Ensure user and group exist in database
      console.log('📝 [AIBot] Step 1: Ensuring user and group exist...');
      await this._dbService.ensureUserAndGroup(message);

      // 2. Build context for AI from database
      console.log('🧠 [AIBot] Step 2: Building context from database...');
      const context = await this._contextBuilder.buildContext(message);
      console.log('📄 [AIBot] Context built, length:', context.length);

      // 3. Analyze intent and generate SQL if needed
      console.log('🎯 [AIBot] Step 3: Analyzing intent with AI...');
      const aiResponse = await this._aiAnalyzer.analyzeAndExecute(message.text || "", context, message);
      console.log('🔍 [AIBot] AI Analysis result:', {
        intent: aiResponse.intent,
        hasSQL: !!aiResponse.sqlQuery,
        responseLength: aiResponse.response?.length || 0
      });

      // 4. Save conversation
      console.log('💾 [AIBot] Step 4: Saving conversation...');
      await this.dbService.saveConversation(message, aiResponse);

      console.log('✅ [AIBot] Message processed successfully');
      return aiResponse.response || 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.';

    } catch (error) {
      console.error('❌ [AIBot] Error processing message:', error);
      return 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.';
    }
  }

  /**
   * Process a message and return structured messages with support for stickers
   */
  async processMessageWithMessagesAndStickers(message: TelegramMessage, telegramToken: string): Promise<ProcessMessageResult> {
    try {
      console.log('🤖 [AIBot] Processing message with messages and stickers:', message.text);

      // 1. Ensure user and group exist in database
      console.log('📝 [AIBot] Step 1: Ensuring user and group exist...');
      await this._dbService.ensureUserAndGroup(message);

      // 2. Build context for AI from database
      console.log('🧠 [AIBot] Step 2: Building context from database...');
      const context = await this._contextBuilder.buildContext(message);
      console.log('📄 [AIBot] Context built, length:', context.length);

      // 3. Analyze intent and generate SQL if needed
      console.log('🎯 [AIBot] Step 3: Analyzing intent with AI...');
      const aiResponse = await this._aiAnalyzer.analyzeAndExecuteWithMessages(message.text || "", context, message);
      console.log('🔍 [AIBot] AI Analysis result:', {
        intent: aiResponse.intent,
        hasSQL: !!aiResponse.sqlQuery,
        messagesCount: aiResponse.messages?.length || 0
      });

      // 4. Send messages with stickers
      console.log('📤 [AIBot] Step 4: Sending messages...');
      const replyToMessageId = message.chat.type === 'supergroup' ? message.message_id : undefined;
      const messageThreadId = message.message_thread_id || undefined;
      await this._stickerService.sendMessagesWithAIStickers(
        message.chat.id, 
        aiResponse.messages || [], 
        telegramToken, 
        replyToMessageId, 
        messageThreadId
      );

      // 5. Save conversation
      console.log('💾 [AIBot] Step 5: Saving conversation...');
      await this._dbService.saveConversation(message, aiResponse);

      console.log('✅ [AIBot] Message processed successfully');
      return {
        messages: aiResponse.messages || [{ text: 'ơ e bị lỗi rùii', delay: '1000' }],
        intent: aiResponse.intent || 'error',
        hasSQL: !!aiResponse.sqlQuery
      };

    } catch (error) {
      console.error('❌ [AIBot] Error processing message:', error);
      return {
        messages: [{ text: 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.', delay: '1000' }],
        intent: 'error',
        hasSQL: false
      };
    }
  }

  /**
   * Process a message and return structured messages without sending them
   */
  async processMessageWithMessages(message: TelegramMessage): Promise<ProcessMessageResult> {
    try {
      console.log('🤖 [AIBot] Processing message with messages:', message.text);

      // 1. Ensure user and group exist in database
      console.log('📝 [AIBot] Step 1: Ensuring user and group exist...');
      await this._dbService.ensureUserAndGroup(message);

      // 2. Build context for AI from database
      console.log('🧠 [AIBot] Step 2: Building context from database...');
      const context = await this._contextBuilder.buildContext(message);
      console.log('📄 [AIBot] Context built, length:', context.length);

      // 3. Analyze intent and generate SQL if needed
      console.log('🎯 [AIBot] Step 3: Analyzing intent with AI...');
      const aiResponse = await this._aiAnalyzer.analyzeAndExecuteWithMessages(message.text || "", context, message);
      console.log('🔍 [AIBot] AI Analysis result:', {
        intent: aiResponse.intent,
        hasSQL: !!aiResponse.sqlQuery,
        messagesCount: aiResponse.messages?.length || 0
      });

      // 4. Save conversation
      console.log('💾 [AIBot] Step 4: Saving conversation...');
      await this._dbService.saveConversation(message, aiResponse);

      console.log('✅ [AIBot] Message processed successfully');
      return {
        messages: aiResponse.messages || [{ text: 'ơ e bị lỗi rùii', delay: '1000' }],
        intent: aiResponse.intent || 'error',
        hasSQL: !!aiResponse.sqlQuery
      };

    } catch (error) {
      console.error('❌ [AIBot] Error processing message:', error);
      return {
        messages: [{ text: 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.', delay: '1000' }],
        intent: 'error',
        hasSQL: false
      };
    }
  }

  // Expose service methods for advanced usage if needed
  get database() { return this._dbService; }
  get contextBuilder() { return this._contextBuilder; }
  get aiAnalyzer() { return this._aiAnalyzer; }
  get stickerService() { return this._stickerService; }
}

// Re-export types for convenience
export type { TelegramMessage, TelegramUser, TelegramChat } from './types/telegram';
export type { ProcessMessageResult, AIResponse } from './types/ai-bot';