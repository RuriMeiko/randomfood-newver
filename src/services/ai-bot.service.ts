import type NeonDB from '@/db/neon';
import type { 
  FoodSuggestion, 
  NewFoodSuggestion, 
  Debt, 
  NewDebt, 
  ChatMember, 
  NewChatMember,
  AiConversation,
  NewAiConversation 
} from '@/db/schema';
import { GeminiAIService, type GeminiAIResponse } from './gemini-ai.service';
import { ConversationContextService } from './conversation-context.service';
import { log } from '@/utils/logger';

export class AIBotService {
  private database: NeonDB;
  private geminiService: GeminiAIService;
  private conversationContext: ConversationContextService;

  constructor(database: NeonDB, geminiApiKey: string) {
    this.database = database;
    this.conversationContext = new ConversationContextService(database);
    this.geminiService = new GeminiAIService(geminiApiKey, this.conversationContext);
  }

  /**
   * Process user message and determine appropriate action
   */
  async processUserMessage(
    userMessage: string,
    userId: string,
    chatId: string,
    username?: string,
    firstName?: string,
    lastName?: string
  ): Promise<{
    success: boolean;
    response: string;
    actionType: string;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Save user message to conversation context
      await this.conversationContext.saveUserMessage(chatId, userId, userMessage);

      // Update/create chat member
      await this.updateChatMember(chatId, userId, username, firstName, lastName);

      // Get current chat members for context
      const chatMembers = await this.getChatMembers(chatId);
      const memberUsernames = chatMembers.map(m => m.username || m.firstName || m.userId).filter(Boolean);

      // Get conversation context from database
      const context = await this.conversationContext.getConversationContext(chatId, userId);
      
      log.debug('Conversation context loaded', {
        chatId, userId,
        messageCount: context.messages.length,
        summaryCount: context.summaries.length,
        totalTokens: context.totalTokens,
        contextStatus: context.contextStatus
      });

      // Process with Gemini AI
      const aiResponse = await this.geminiService.processMessage(
        userMessage, 
        memberUsernames, 
        userId,
        chatId,
        username,
        context
      );

      const processingTime = Date.now() - startTime;

      // Log conversation
      await this.logConversation(
        chatId, 
        userId, 
        userMessage, 
        JSON.stringify(aiResponse), 
        aiResponse.actionType,
        processingTime
      );

      if (!aiResponse.success) {
        return {
          success: false,
          response: aiResponse.response,
          actionType: 'error',
          error: aiResponse.error
        };
      }

      // Save bot response to conversation context
      if (aiResponse.response) {
        await this.conversationContext.saveBotResponse(chatId, userId, aiResponse.response);
      }

      // Handle different action types
      switch (aiResponse.actionType) {
        case 'food_suggestion':
          await this.handleFoodSuggestion(chatId, userId, username, userMessage, aiResponse);
          break;
          
        case 'debt_tracking':
          await this.handleDebtTracking(chatId, userId, username, userMessage, aiResponse);
          break;
          
        case 'conversation':
          // Just conversation, no additional action needed
          break;
      }

      // Log context usage stats periodically
      if (Math.random() < 0.1) { // 10% chance
        const stats = await this.conversationContext.getContextStats(chatId, userId);
        log.info('Context usage stats', { 
          chatId, userId, 
          ...stats,
          statusCheck: context.contextStatus
        });
      }

      return {
        success: true,
        response: aiResponse.response,
        actionType: aiResponse.actionType
      };

    } catch (error: any) {
      log.error('Error processing user message', error, { userId, chatId, userMessage });
      return {
        success: false,
        response: 'Có lỗi xảy ra khi xử lý tin nhắn của bạn. Vui lòng thử lại.',
        actionType: 'error',
        error: error.message
      };
    }
  }

  /**
   * Handle food suggestion action
   */
  private async handleFoodSuggestion(
    chatId: string, 
    userId: string, 
    username: string | undefined,
    userMessage: string,
    aiResponse: GeminiAIResponse
  ): Promise<void> {
    try {
      const newSuggestion: NewFoodSuggestion = {
        userId,
        chatId,
        username: username || null,
        suggestion: aiResponse.data?.foodName || aiResponse.response,
        prompt: userMessage,
        aiResponse: JSON.stringify(aiResponse),
      };

      await this.database.query(
        'INSERT INTO food_suggestions (user_id, chat_id, username, suggestion, prompt, ai_response) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, chatId, username || null, newSuggestion.suggestion, userMessage, newSuggestion.aiResponse]
      );

      log.user.action('ai_food_suggested', userId, { 
        chatId,
        foodName: aiResponse.data?.foodName,
        hasQuestions: aiResponse.data?.questions?.length || 0
      });

    } catch (error: any) {
      log.error('Error saving food suggestion', error, { userId, chatId });
    }
  }

  /**
   * Handle debt tracking action
   */
  private async handleDebtTracking(
    chatId: string, 
    userId: string, 
    username: string | undefined,
    userMessage: string,
    aiResponse: GeminiAIResponse
  ): Promise<void> {
    try {
      const debtData = aiResponse.data;
      if (!debtData || !debtData.action) return;

      switch (debtData.action) {
        case 'create':
          if (debtData.debtorUsername && debtData.creditorUsername && debtData.amount) {
            // Find user IDs for usernames
            const debtorMember = await this.findMemberByUsername(chatId, debtData.debtorUsername);
            const creditorMember = await this.findMemberByUsername(chatId, debtData.creditorUsername);

            if (debtorMember && creditorMember) {
              const newDebt: NewDebt = {
                chatId,
                debtorUserId: debtorMember.userId,
                debtorUsername: debtorMember.username,
                creditorUserId: creditorMember.userId,
                creditorUsername: creditorMember.username,
                amount: debtData.amount.toString(),
                currency: debtData.currency || 'VND',
                description: debtData.description || userMessage,
                aiDetection: JSON.stringify(aiResponse),
              };

              await this.database.query(
                'INSERT INTO debts (chat_id, debtor_user_id, debtor_username, creditor_user_id, creditor_username, amount, currency, description, ai_detection) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [chatId, newDebt.debtorUserId, newDebt.debtorUsername, newDebt.creditorUserId, newDebt.creditorUsername, newDebt.amount, newDebt.currency, newDebt.description, newDebt.aiDetection]
              );

              log.user.action('ai_debt_created', userId, { 
                chatId,
                debtor: debtData.debtorUsername,
                creditor: debtData.creditorUsername,
                amount: debtData.amount
              });
            }
          }
          break;

        case 'pay':
          // Mark debt as paid
          if (debtData.debtorUsername && debtData.creditorUsername) {
            await this.database.query(
              'UPDATE debts SET is_paid = true, paid_at = NOW() WHERE chat_id = $1 AND debtor_username = $2 AND creditor_username = $3 AND is_paid = false',
              [chatId, debtData.debtorUsername, debtData.creditorUsername]
            );

            log.user.action('ai_debt_paid', userId, { 
              chatId,
              debtor: debtData.debtorUsername,
              creditor: debtData.creditorUsername
            });
          }
          break;
      }

    } catch (error: any) {
      log.error('Error handling debt tracking', error, { userId, chatId });
    }
  }

  /**
   * Update or create chat member
   */
  private async updateChatMember(
    chatId: string, 
    userId: string, 
    username?: string, 
    firstName?: string, 
    lastName?: string
  ): Promise<void> {
    try {
      // Check if member exists
      const existingMember = await this.database.query(
        'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId]
      );

      if (existingMember.length > 0) {
        // Update existing member
        await this.database.query(
          'UPDATE chat_members SET username = $3, first_name = $4, last_name = $5, last_seen = NOW() WHERE chat_id = $1 AND user_id = $2',
          [chatId, userId, username || null, firstName || null, lastName || null]
        );
      } else {
        // Create new member
        await this.database.query(
          'INSERT INTO chat_members (chat_id, user_id, username, first_name, last_name) VALUES ($1, $2, $3, $4, $5)',
          [chatId, userId, username || null, firstName || null, lastName || null]
        );
      }

    } catch (error: any) {
      log.error('Error updating chat member', error, { chatId, userId });
    }
  }

  /**
   * Get chat members
   */
  private async getChatMembers(chatId: string): Promise<ChatMember[]> {
    try {
      const members = await this.database.query(
        'SELECT * FROM chat_members WHERE chat_id = $1 AND is_active = true ORDER BY last_seen DESC',
        [chatId]
      ) as ChatMember[];

      return members;
    } catch (error: any) {
      log.error('Error getting chat members', error, { chatId });
      return [];
    }
  }

  /**
   * Find member by username
   */
  private async findMemberByUsername(chatId: string, username: string): Promise<ChatMember | null> {
    try {
      const members = await this.database.query(
        'SELECT * FROM chat_members WHERE chat_id = $1 AND (username ILIKE $2 OR first_name ILIKE $2) AND is_active = true',
        [chatId, `%${username}%`]
      ) as ChatMember[];

      return members[0] || null;
    } catch (error: any) {
      log.error('Error finding member by username', error, { chatId, username });
      return null;
    }
  }

  /**
   * Log AI conversation
   */
  private async logConversation(
    chatId: string,
    userId: string,
    userMessage: string,
    aiResponse: string,
    actionType: string,
    processingTime: number
  ): Promise<void> {
    try {
      await this.database.query(
        'INSERT INTO ai_conversations (chat_id, user_id, user_message, ai_response, action_type, processing_time) VALUES ($1, $2, $3, $4, $5, $6)',
        [chatId, userId, userMessage, aiResponse, actionType, processingTime]
      );
    } catch (error: any) {
      log.error('Error logging conversation', error, { chatId, userId });
    }
  }

  /**
   * Get user's food history
   */
  async getUserFoodHistory(userId: string, limit: number = 10): Promise<FoodSuggestion[]> {
    try {
      const history = await this.database.query(
        'SELECT * FROM food_suggestions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      ) as FoodSuggestion[];

      return history;
    } catch (error: any) {
      log.error('Error getting user food history', error, { userId });
      return [];
    }
  }

  /**
   * Get chat debts
   */
  async getChatDebts(chatId: string, onlyUnpaid: boolean = false): Promise<Debt[]> {
    try {
      let query = 'SELECT * FROM debts WHERE chat_id = $1';
      const params = [chatId];

      if (onlyUnpaid) {
        query += ' AND is_paid = false';
      }

      query += ' ORDER BY created_at DESC';

      const debts = await this.database.query(query, params) as Debt[];
      return debts;
    } catch (error: any) {
      log.error('Error getting chat debts', error, { chatId });
      return [];
    }
  }
}