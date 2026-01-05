/**
 * AI Bot - Autonomous Agent Version
 * 
 * This is the refactored version that implements:
 * - Tool-based architecture
 * - Self-managed long-term memory
 * - Schema-agnostic operation
 * - Database as observable external memory
 */

import { DatabaseService } from './services/database';
import { ContextBuilderService } from './services/context-builder-autonomous';
import { AIAnalyzerService } from './services/ai-analyzer-autonomous';
import TelegramApi from './telegram/api.js';
import type { TelegramMessage } from './types/telegram';
import type { ProcessMessageResult, AIResponse } from './types/ai-bot';

// Re-export types for convenience
export type { TelegramMessage, ProcessMessageResult, AIResponse };

export class AIBotAutonomous {
  private _dbService: DatabaseService;
  private _contextBuilder: ContextBuilderService;
  private _aiAnalyzer: AIAnalyzerService;

  constructor(apiKey: string, databaseUrl: string) {
    console.log('🤖 [AIBotAutonomous] Initializing autonomous agent...');
    
    // Initialize services
    this._dbService = new DatabaseService(databaseUrl);
    this._contextBuilder = new ContextBuilderService(this._dbService);
    // Pass databaseUrl to AIAnalyzerService for ApiKeyManager
    this._aiAnalyzer = new AIAnalyzerService(apiKey, this._dbService, databaseUrl);
    
    console.log('✅ [AIBotAutonomous] Autonomous agent initialized');
  }

  /**
   * Process a message with autonomous agent capabilities
   */
  async processMessageWithMessagesAndStickers(
    message: TelegramMessage,
    telegramToken: string,
    ctx?: ExecutionContext
  ): Promise<ProcessMessageResult> {
    try {
      console.log('🤖 [AIBotAutonomous] Processing message:', message.text);

      const telegramApi = new TelegramApi(telegramToken);
      
      // 1. Start parallel operations immediately
      console.log('⌨️ [AIBotAutonomous] Step 1: Starting parallel operations...');
      
      // Non-blocking: Show typing indicator
      const typingPromise = telegramApi.sendChatAction(message.chat.id, 'typing');
      
      // Non-blocking: Ensure user and group exist in database
      const ensureUserPromise = this._dbService.ensureUserAndGroup(message);
      
      // Run typing and user setup in parallel
      await Promise.all([typingPromise, ensureUserPromise]);

      // 1.5. Save user message IMMEDIATELY after ensuring user exists
      console.log('💾 [AIBotAutonomous] Step 1.5: Saving user message to DB...');
      await this._dbService.saveUserMessage(message);
      console.log('✅ [AIBotAutonomous] User message saved');

      // 2. Build schema-agnostic context
      console.log('🧠 [AIBotAutonomous] Step 2: Building context (schema-agnostic)...');
      const context = await this._contextBuilder.buildContext(message);
      console.log('📄 [AIBotAutonomous] Context built');

      // 3. Execute autonomous agent with tool calling loop
      console.log('🎯 [AIBotAutonomous] Step 3: Running autonomous agent...');
      const aiResponse = await this._aiAnalyzer.analyzeAndExecuteWithMessages(
        message.text || "",
        context,
        message,
        ctx
      );
      console.log('🔍 [AIBotAutonomous] Agent response:', {
        intent: aiResponse.intent,
        messageCount: aiResponse.messages?.length || 0
      });

      // 4. Process messages with stickers
      const messages = aiResponse.messages || [{ text: 'Xin lỗi, em chưa hiểu 🥺', delay: '1000' }];

      // 5. Send messages to Telegram
      console.log('📤 [AIBotAutonomous] Step 4: Sending messages to Telegram...');
      for (const msg of messages) {
        const delay = parseInt(msg.delay) || 1000;
        
        // Show typing indicator
        await telegramApi.sendChatAction(message.chat.id, 'typing');
        
        // Wait for natural typing delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Send message
        await telegramApi.sendMessage({ 
          chat_id: message.chat.id, 
          text: msg.text 
        });
        console.log(`✅ [AIBotAutonomous] Sent message: ${msg.text.substring(0, 50)}...`);
      }

      console.log('✅ [AIBotAutonomous] Message processing complete');
      
      return {
        messages,
        intent: aiResponse.intent || 'unknown',
        hasSQL: false // SQL is handled internally by tools now
      };

    } catch (error) {
      console.error('❌ [AIBotAutonomous] Error processing message:', error);
      
      // Send error message to user
      try {
        const telegramApi = new TelegramApi(telegramToken);
        await telegramApi.sendMessage({
          chat_id: message.chat.id,
          text: 'ơ e bị lỗi rồi 😢\\nthử lại được không nè'
        });
      } catch (sendError) {
        console.error('❌ [AIBotAutonomous] Failed to send error message:', sendError);
      }

      return {
        messages: [{ text: 'ơ e bị lỗi rồi 😢', delay: '1000' }],
        intent: 'error',
        hasSQL: false
      };
    }
  }

  /**
   * Simple text response (legacy compatibility)
   */
  async processMessage(message: TelegramMessage): Promise<string> {
    try {
      console.log('🤖 [AIBotAutonomous] Processing simple message:', message.text);

      // 1. Ensure user and group exist
      await this._dbService.ensureUserAndGroup(message);
      await this._dbService.saveUserMessage(message);

      // 2. Build context
      const context = await this._contextBuilder.buildContext(message);

      // 3. Run autonomous agent
      const aiResponse = await this._aiAnalyzer.analyzeAndExecute(
        message.text || "",
        context,
        message
      );

      console.log('✅ [AIBotAutonomous] Simple message processed');
      return aiResponse.response || 'Xin lỗi, em chưa hiểu 🥺';

    } catch (error) {
      console.error('❌ [AIBotAutonomous] Error processing simple message:', error);
      return 'ơ e bị lỗi rồi 😢\\nthử lại được không nè';
    }
  }

  // Expose database service for external use if needed
  get database() {
    return this._dbService;
  }
}
