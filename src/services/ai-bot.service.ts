import type NeonDB from '@/db/neon';
import type { 
  FoodSuggestion, 
  NewFoodSuggestion, 
  Debt, 
  NewDebt, 
  ChatMember, 
  NewChatMember,
  UserAlias,
  NewUserAlias
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
    lastName?: string,
    telegramMessage?: any
  ): Promise<{
    messageConfig: any;
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

      // Prepare enriched context for AI
      const enrichedContext = await this.prepareEnrichedContext(
        userMessage, 
        chatId, 
        userId, 
        username, 
        context
      );

      // Prepare Telegram data for AI
      const telegramData = telegramMessage ? {
        messageId: telegramMessage.message_id,
        firstName: firstName || telegramMessage.from?.first_name,
        lastName: lastName || telegramMessage.from?.last_name,
        date: telegramMessage.date,
        fullTelegramObject: telegramMessage
      } : undefined;

      // Process with Gemini AI
      const aiResponse = await this.geminiService.processMessage(
        userMessage, 
        memberUsernames, 
        userId,
        chatId,
        username,
        enrichedContext,
        telegramData
      );

      const processingTime = Date.now() - startTime;

      // No longer using ai_conversations table - data is stored in specialized tables

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

      // Handle SQL execution if AI provided SQL
      if (aiResponse.sql && aiResponse.sqlParams) {
        await this.executeAIGeneratedSQL(
          aiResponse.sql, 
          aiResponse.sqlParams, 
          userId, 
          chatId, 
          username, 
          aiResponse.actionType,
          firstName,
          lastName,
          telegramMessage
        );
      }

      // Skip context stats for now to avoid DB errors
      if (Math.random() < 0.05) { // 5% chance, simplified logging
        log.info('Context usage check', { 
          chatId, userId,
          contextStatus: context?.contextStatus || 'unknown',
          messageCount: context?.messages?.length || 0
        });
      }

      // LOG TRƯỚC KHI RETURN ĐỂ CHECK MESSAGECONFIG
      log.info('🔍 AI BOT SERVICE TRƯỚC KHI RETURN', {
        chatId, userId,
        response: aiResponse.response?.substring(0, 50),
        actionType: aiResponse.actionType,
        hasMessageConfig: !!aiResponse.messageConfig,
        messageConfig: aiResponse.messageConfig ? {
          shouldSplit: aiResponse.messageConfig.shouldSplit,
          messageCount: aiResponse.messageConfig.messages?.length,
          delays: aiResponse.messageConfig.delays
        } : null
      });

      return {
        success: true,
        response: aiResponse.response,
        actionType: aiResponse.actionType,
        messageConfig: aiResponse.messageConfig  // ĐẢM BẢO TRUYỀN messageConfig
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
   * Execute AI-generated SQL safely
   */
  private async executeAIGeneratedSQL(
    sql: string, 
    params: any[], 
    userId: string, 
    chatId: string, 
    username?: string, 
    actionType?: string,
    firstName?: string,
    lastName?: string,
    telegramMessage?: any
  ): Promise<any> {
    try {
      // Replace placeholder params with actual values
      const processedParams = params.map(param => {
        // Legacy placeholders
        if (param === 'user_id_here') return userId;
        if (param === 'chat_id_here') return chatId;
        if (param === 'username_here') return username || 'Unknown';
        
        // New Telegram context placeholders
        if (param === 'telegram_user_id') return userId;
        if (param === 'telegram_chat_id') return chatId;
        if (param === 'telegram_username') return username;
        if (param === 'telegram_first_name') return firstName;
        if (param === 'telegram_last_name') return lastName;
        if (param === 'telegram_message_id') return telegramMessage?.message_id;
        if (param === 'telegram_date') return telegramMessage?.date;
        
        return param;
      });

      // Execute the SQL
      const result = await this.database.query(sql, processedParams);

      log.info('AI-generated SQL executed', { 
        userId, 
        chatId, 
        actionType,
        sqlPreview: sql.substring(0, 50) + '...',
        paramCount: processedParams.length,
        rowsAffected: Array.isArray(result) ? result.length : result.rowCount || 0
      });

      return result;
    } catch (error: any) {
      log.error('Error executing AI-generated SQL', error, { 
        userId, 
        chatId, 
        sql: sql.substring(0, 100),
        params: params.length 
      });
      // Don't throw - SQL failure shouldn't break the main flow
      return null;
    }
  }

  // handleDebtTracking method removed - now using AI-generated SQL approach

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
   * Find member by user ID
   */
  private async findMemberByUserId(chatId: string, userId: string): Promise<ChatMember | null> {
    try {
      const members = await this.database.query(
        'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND is_active = true',
        [chatId, userId]
      ) as ChatMember[];

      return members[0] || null;
    } catch (error: any) {
      log.error('Error finding member by user ID', error, { chatId, userId });
      return null;
    }
  }

  /**
   * Create virtual member for debt tracking (when user mentioned doesn't exist in chat_members)
   */
  private async createVirtualMember(chatId: string, displayName: string): Promise<ChatMember | null> {
    try {
      // Generate virtual user ID (use timestamp + random for uniqueness)
      const virtualUserId = `virtual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      log.info('Creating virtual member', { 
        chatId, 
        displayName, 
        virtualUserId
      });
      
      // Create virtual member
      await this.database.query(
        'INSERT INTO chat_members (chat_id, user_id, username, first_name, is_active) VALUES ($1, $2, $3, $4, $5)',
        [chatId, virtualUserId, null, displayName, true]
      );

      // Return created member with proper structure
      const virtualMember: ChatMember = {
        chatId: chatId,
        userId: virtualUserId,
        username: null,
        firstName: displayName,
        lastName: null,
        isActive: true,
        joinedAt: new Date(),
        lastActiveAt: new Date()
      };

      log.info('Virtual member created successfully', { 
        chatId, 
        displayName, 
        virtualUserId,
        memberStructure: virtualMember
      });

      return virtualMember;
    } catch (error: any) {
      log.error('Error creating virtual member', error, { chatId, displayName });
      return null;
    }
  }

  // Removed logConversation method - no longer using ai_conversations table

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

  /**
   * Prepare enriched context with smart data lookup
   */
  private async prepareEnrichedContext(
    userMessage: string,
    chatId: string,
    userId: string,
    username?: string,
    baseContext?: any
  ): Promise<any> {
    const enrichedContext = { ...baseContext };
    
    // Detect if user is asking about debts or food
    const isDebtQuery = this.isDebtRelatedQuery(userMessage);
    const isFoodQuery = this.isFoodRelatedQuery(userMessage);
    
    try {
      // Add debt information if relevant
      if (isDebtQuery) {
        const allDebts = await this.getChatDebts(chatId);
        const unpaidDebts = await this.getChatDebts(chatId, true);
        const debtSummary = this.calculateDebtSummary(allDebts, username);
        
        enrichedContext.debtData = {
          allDebts: allDebts.slice(0, 20), // Limit to recent 20
          unpaidDebts,
          summary: debtSummary,
          totalRecords: allDebts.length
        };
        
        log.debug('Added debt context', { 
          chatId, userId,
          totalDebts: allDebts.length,
          unpaidDebts: unpaidDebts.length,
          userBalance: debtSummary.netBalance
        });
      }
      
      // Add food history if relevant
      if (isFoodQuery) {
        const foodHistory = await this.getUserFoodHistory(userId, 10);
        const recentSuggestions = await this.getChatFoodHistory(chatId, 10);
        
        enrichedContext.foodData = {
          userHistory: foodHistory,
          chatHistory: recentSuggestions,
          totalUserSuggestions: foodHistory.length
        };
        
        log.debug('Added food context', {
          chatId, userId,
          userSuggestions: foodHistory.length,
          chatSuggestions: recentSuggestions.length
        });
      }

      // Temporarily disable alias queries to avoid SQL syntax error
      try {
        const knownAliases = await this.database.query(
          'SELECT * FROM user_aliases ORDER BY confidence DESC'
        ) as UserAlias[];

        if (knownAliases.length > 0) {
          enrichedContext.aliasData = {
            knownAliases: knownAliases.map(alias => ({
              realName: alias.realName,
              aliases: alias.aliases as string[],
              confidence: alias.confidence,
              isConfirmed: alias.isConfirmed
            })),
            totalMappings: knownAliases.length
          };

          log.debug('Added alias context', {
            chatId, userId,
            aliasMappings: knownAliases.length
          });
        }
      } catch (aliasError: any) {
        log.warn('Alias query failed, continuing without aliases', { 
          error: aliasError.message,
          chatId, userId 
        });
        // Continue without aliases - don't break the main flow
      }
      
    } catch (error: any) {
      log.error('Error preparing enriched context', error, { chatId, userId });
    }
    
    return enrichedContext;
  }

  /**
   * Check if message is debt-related
   */
  private isDebtRelatedQuery(message: string): boolean {
    const debtKeywords = [
      'nợ', 'debt', 'tiền', 'money', 'trả', 'pay', 'owes', 'owed',
      'mượn', 'borrow', 'lend', 'cho vay', 'vay', 'số dư', 'balance',
      'tính toán', 'tổng', 'total', 'bao nhiêu', 'how much'
    ];
    
    const lowerMessage = message.toLowerCase();
    return debtKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if message is food-related
   */
  private isFoodRelatedQuery(message: string): boolean {
    const foodKeywords = [
      'ăn', 'eat', 'food', 'món', 'dish', 'nấu', 'cook', 'cooking',
      'đói', 'hungry', 'bụng đói', 'đói bụng', 'hôm nay ăn gì',
      'hôm nay nấu gì', 'what to eat', 'gợi ý', 'suggest', 'món ăn',
      'food', 'recipe', 'công thức', 'cách làm', 'how to cook',
      'nguyên liệu', 'ingredients', 'lịch sử', 'history', 'đã ăn'
    ];
    
    const lowerMessage = message.toLowerCase();
    return foodKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Calculate debt summary for a user
   */
  private calculateDebtSummary(debts: Debt[], username?: string) {
    let totalOwed = 0; // Số tiền user nợ người khác
    let totalLent = 0; // Số tiền người khác nợ user
    let netBalance = 0; // Số dư cuối cùng
    
    const debtDetails: any[] = [];
    const creditorDetails: any[] = [];
    
    debts.forEach(debt => {
      const amount = parseFloat(debt.amount) || 0;
      const isPaid = debt.isPaid;
      
      if (!isPaid) {
        if (debt.debtorUsername === username) {
          // User nợ người khác
          totalOwed += amount;
          debtDetails.push({
            creditor: debt.creditorUsername,
            amount,
            description: debt.description,
            date: debt.createdAt
          });
        } else if (debt.creditorUsername === username) {
          // Người khác nợ user
          totalLent += amount;
          creditorDetails.push({
            debtor: debt.debtorUsername,
            amount,
            description: debt.description,
            date: debt.createdAt
          });
        }
      }
    });
    
    netBalance = totalLent - totalOwed; // Dương = người ta nợ user, âm = user nợ người ta
    
    return {
      totalOwed,
      totalLent,
      netBalance,
      debtDetails,
      creditorDetails,
      status: netBalance > 0 ? 'creditor' : netBalance < 0 ? 'debtor' : 'balanced'
    };
  }

  /**
   * Get recent food suggestions for the chat
   */
  private async getChatFoodHistory(chatId: string, limit: number = 10): Promise<FoodSuggestion[]> {
    try {
      const history = await this.database.query(
        'SELECT * FROM food_suggestions WHERE chat_id = $1 ORDER BY created_at DESC LIMIT $2',
        [chatId, limit]
      ) as FoodSuggestion[];

      return history;
    } catch (error: any) {
      log.error('Error getting chat food history', error, { chatId });
      return [];
    }
  }

  /**
   * Smart name resolution using aliases
   */
  private async resolveUserName(chatId: string, mentionedName: string): Promise<{
    userId?: string;
    realName?: string;
    confidence: number;
    needsConfirmation: boolean;
    possibleMatches?: UserAlias[];
  }> {
    try {
      // Get all aliases (global scope)
      const aliases = await this.database.query(
        'SELECT * FROM user_aliases'
      ) as UserAlias[];

      const matches: { alias: UserAlias; score: number }[] = [];

      // Score each alias
      aliases.forEach(alias => {
        const aliasArray = alias.aliases as string[];
        
        aliasArray.forEach(aliasName => {
          const score = this.calculateNameSimilarity(mentionedName.toLowerCase(), aliasName.toLowerCase());
          if (score > 0.3) { // Threshold for considering a match
            matches.push({ alias, score });
          }
        });

        // Also check real name
        const realNameScore = this.calculateNameSimilarity(mentionedName.toLowerCase(), alias.realName.toLowerCase());
        if (realNameScore > 0.3) {
          matches.push({ alias, score: realNameScore });
        }
      });

      // Sort by score descending
      matches.sort((a, b) => b.score - a.score);

      if (matches.length === 0) {
        return { confidence: 0, needsConfirmation: true };
      }

      const bestMatch = matches[0];
      
      // High confidence if score > 0.8 or exact match
      if (bestMatch.score > 0.8 || matches[0].score === 1.0) {
        return {
          userId: bestMatch.alias.userId,
          realName: bestMatch.alias.realName,
          confidence: bestMatch.score,
          needsConfirmation: false
        };
      }

      // Medium confidence - might need confirmation if multiple close matches
      if (matches.length > 1 && matches[1].score > 0.6) {
        return {
          confidence: bestMatch.score,
          needsConfirmation: true,
          possibleMatches: matches.slice(0, 3).map(m => m.alias)
        };
      }

      return {
        userId: bestMatch.alias.userId,
        realName: bestMatch.alias.realName,
        confidence: bestMatch.score,
        needsConfirmation: bestMatch.score < 0.7
      };

    } catch (error: any) {
      log.error('Error resolving user name', error, { chatId, mentionedName });
      return { confidence: 0, needsConfirmation: true };
    }
  }

  /**
   * Calculate name similarity score
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const clean1 = name1.toLowerCase().trim();
    const clean2 = name2.toLowerCase().trim();
    
    // Exact match
    if (clean1 === clean2) return 1.0;
    
    // Full name contains exact alias
    if (clean1.includes(clean2) && clean2.length >= 2) return 0.95;
    if (clean2.includes(clean1) && clean1.length >= 2) return 0.95;
    
    // Fuzzy matching for Vietnamese names
    const cleanName1 = this.cleanVietnameseName(clean1);
    const cleanName2 = this.cleanVietnameseName(clean2);
    
    if (cleanName1 === cleanName2) return 0.9;
    
    // Word-based matching for compound names
    const words1 = cleanName1.split(/\s+/);
    const words2 = cleanName2.split(/\s+/);
    
    let matchedWords = 0;
    const totalWords = Math.max(words1.length, words2.length);
    
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 && word1.length >= 2) {
          matchedWords++;
          break;
        }
      }
    }
    
    if (matchedWords > 0) {
      return Math.min(0.85, 0.5 + (matchedWords / totalWords) * 0.35);
    }
    
    // Character-based fuzzy matching
    if (cleanName1.includes(cleanName2) || cleanName2.includes(cleanName1)) {
      return 0.6;
    }
    
    // Levenshtein distance for close matches
    const distance = this.levenshteinDistance(cleanName1, cleanName2);
    const maxLength = Math.max(cleanName1.length, cleanName2.length);
    const similarity = Math.max(0, 1 - (distance / maxLength));
    
    return similarity > 0.7 ? similarity : 0;
  }

  /**
   * Clean Vietnamese name for better matching
   */
  private cleanVietnameseName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  /**
   * Simple Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Create or update user alias mapping (global scope)
   */
  async createUserAlias(
    userId: string,
    realName: string,
    aliases: string[],
    createdBy: string,
    confidence: number = 1.0
  ): Promise<boolean> {
    try {
      // Check if alias already exists
      const existing = await this.database.query(
        'SELECT * FROM user_aliases WHERE user_id = $1',
        [userId]
      ) as UserAlias[];

      if (existing.length > 0) {
        // Update existing alias
        const existingAliases = existing[0].aliases as string[];
        const mergedAliases = [...new Set([...existingAliases, ...aliases])];
        
        await this.database.query(
          'UPDATE user_aliases SET aliases = $1, real_name = $2, confidence = $3, updated_at = NOW() WHERE user_id = $4',
          [JSON.stringify(mergedAliases), realName, confidence, userId]
        );
      } else {
        // Create new alias
        await this.database.query(
          'INSERT INTO user_aliases (user_id, real_name, aliases, confidence, created_by) VALUES ($1, $2, $3, $4, $5)',
          [userId, realName, JSON.stringify(aliases), confidence, createdBy]
        );
      }

      log.info('User alias created/updated', { 
        userId, realName, 
        aliases: aliases.length,
        confidence 
      });

      return true;
    } catch (error: any) {
      log.error('Error creating user alias', error, { userId, realName });
      return false;
    }
  }
}