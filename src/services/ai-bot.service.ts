import type NeonDB from '@/db/neon';
import type { 
  ChatMember, 
  NewChatMember,
  UserMemory,
  NewUserMemory
} from '@/db/schema';
import { GeminiAIService, type GeminiAIResponse } from './gemini-ai.service';
import { ConversationContextService } from './conversation-context.service';
import { log } from '@/utils/logger';

/**
 * 🚀 STREAMLINED AI BOT SERVICE
 * 
 * Simplified version that relies on AI's ability to:
 * - Generate and execute SQL queries autonomously
 * - Analyze data intelligently 
 * - Format responses naturally
 * - Handle edge cases creatively
 * 
 * This eliminates 1000+ lines of redundant helper methods
 */
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
   * 🎯 MAIN ORCHESTRATION - Process user message
   */
  async processUserMessage(
    userMessage: string,
    userId: string,
    chatId: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    telegramMessage?: any,
    replyContext?: {
      isReply: boolean;
      originalMessage: string;
      originalMessageId?: number;
      originalDate?: number;
    }
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

      // Prepare basic enriched context (AI will query additional data as needed)
      const enrichedContext = { ...context };

      // Prepare Telegram data for AI
      const telegramData = telegramMessage ? {
        messageId: telegramMessage.message_id,
        firstName: firstName || telegramMessage.from?.first_name,
        lastName: lastName || telegramMessage.from?.last_name,
        date: telegramMessage.date,
        fullTelegramObject: telegramMessage
      } : undefined;

      // Add reply context if this is a reply
      if (replyContext?.isReply) {
        enrichedContext.replyData = {
          isReplyToBot: true,
          originalMessage: replyContext.originalMessage,
          originalMessageId: replyContext.originalMessageId,
          timeDifference: replyContext.originalDate ? Math.floor((Date.now() / 1000) - replyContext.originalDate) : undefined
        };
        
        log.info('💬 REPLY MESSAGE DETECTED', {
          userId, chatId,
          originalMessage: replyContext.originalMessage.substring(0, 50),
          timeDifference: enrichedContext.replyData.timeDifference
        });
      }

      // 🧠 Process with Gemini AI (AI will decide what data it needs)
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

      if (!aiResponse.success) {
        return {
          success: false,
          response: aiResponse.response,
          actionType: 'error',
          error: aiResponse.error,
          messageConfig: undefined
        };
      }

      // Save bot response to conversation context
      if (aiResponse.response) {
        await this.conversationContext.saveBotResponse(chatId, userId, aiResponse.response);
      }

      // 🔄 Handle SQL execution and recursive AI queries
      let finalResponse = aiResponse.response;
      
      if (aiResponse.sql && aiResponse.sqlParams) {
        const sqlResult = await this.executeAIGeneratedSQL(
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

        // 🧠 ENHANCED RECURSIVE AI SYSTEM - AI decides when to continue
        const needsRecursion = aiResponse.needsRecursion || 
                              aiResponse.needsContinuation ||
                              aiResponse.actionType === 'context_query' ||
                              (aiResponse.actionType === 'debt_tracking' && aiResponse.sql.toLowerCase().includes('select'));
        
        log.info('🔍 ENHANCED RECURSIVE AI ANALYSIS', {
          userId, chatId,
          actionType: aiResponse.actionType,
          needsRecursion,
          needsContinuation: aiResponse.needsContinuation,
          maxRecursions: aiResponse.maxRecursions || 1,
          continuationPrompt: aiResponse.continuationPrompt?.substring(0, 50),
          sqlResultCount: sqlResult ? (Array.isArray(sqlResult) ? sqlResult.length : 1) : 0,
          contextQuery: aiResponse.contextQuery,
          sqlPreview: aiResponse.sql ? aiResponse.sql.substring(0, 100) + '...' : null
        });
        
        if (needsRecursion) {
          finalResponse = await this.processEnhancedRecursiveAI(
            sqlResult,
            aiResponse,
            userId,
            chatId,
            username,
            firstName,
            lastName,
            userMessage,
            1 // current recursion level
          );
        }
      }

      // LOG BEFORE RETURN
      log.info('🔍 STREAMLINED AI BOT SERVICE RESPONSE', {
        chatId, userId,
        originalResponse: aiResponse.response?.substring(0, 50),
        finalResponse: finalResponse?.substring(0, 50),
        responseChanged: aiResponse.response !== finalResponse,
        actionType: aiResponse.actionType,
        hasMessageConfig: !!aiResponse.messageConfig,
        processingTime
      });

      // 🎭 Handle progressive messaging for recursive AI responses
      if (aiResponse.response !== finalResponse) {
        return {
          success: true,
          response: finalResponse,
          actionType: aiResponse.actionType,
          messageConfig: {
            shouldSplit: true,
            messages: [
              ...(aiResponse.messageConfig?.messages || [aiResponse.response]),
              finalResponse
            ],
            delays: [
              ...(aiResponse.messageConfig?.delays || [1000]),
              2000
            ],
            typingDuration: aiResponse.messageConfig?.typingDuration || 1500
          }
        };
      }
      
      // Use original messageConfig if no recursive processing happened
      return {
        success: true,
        response: finalResponse,
        actionType: aiResponse.actionType,
        messageConfig: aiResponse.messageConfig
      };

    } catch (error: any) {
      log.error('Error processing user message', error, { userId, chatId, userMessage });
      return {
        success: false,
        response: Math.random() > 0.5 ? 'Lỗi rồi a ơi, thử lại đi' : 'Có bug gì đó, retry nha',
        actionType: 'error',
        error: error.message,
        messageConfig: undefined
      };
    }
  }

  /**
   * 🔧 Execute AI-generated SQL safely with parameter replacement - supports multiple statements
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
      // Replace placeholder params with actual Telegram context values
      const processedParams = params.map(param => {
        if (param === 'telegram_user_id') return userId;
        if (param === 'telegram_chat_id') return chatId;
        if (param === 'telegram_username') return username;
        if (param === 'telegram_first_name') return firstName;
        if (param === 'telegram_last_name') return lastName;
        if (param === 'telegram_message_id') return telegramMessage?.message_id;
        if (param === 'telegram_date') return telegramMessage?.date;
        
        return param;
      });

      // Check if this is multiple SQL statements (separated by ;\n)
      const sqlStatements = sql.split(';\n').filter(s => s.trim().length > 0);
      
      if (sqlStatements.length > 1) {
        log.info('🔄 EXECUTING MULTIPLE SQL STATEMENTS', { 
          userId, chatId, actionType,
          statementCount: sqlStatements.length,
          sqlPreview: sql.substring(0, 100) + '...'
        });

        const results = [];
        let paramIndex = 0;

        for (let i = 0; i < sqlStatements.length; i++) {
          const statement = sqlStatements[i].trim();
          
          // Count parameters in this statement  
          const paramCount = (statement.match(/\$\d+/g) || []).length;
          const stmtParams = processedParams.slice(paramIndex, paramIndex + paramCount);
          
          log.info(`Executing statement ${i + 1}/${sqlStatements.length}`, {
            userId, chatId,
            statement: statement.substring(0, 80) + '...',
            paramCount,
            paramIndex
          });

          const result = await this.database.query(statement, stmtParams);
          results.push(result);
          
          paramIndex += paramCount;
        }

        log.info('✅ ALL SQL STATEMENTS EXECUTED', { 
          userId, chatId, actionType,
          totalStatements: sqlStatements.length,
          totalResults: results.length,
          totalRowsAffected: results.reduce((sum, result) => sum + (Array.isArray(result) ? result.length : result?.rowCount || 0), 0)
        });

        return results; // Return array of results
      } else {
        // Single SQL statement
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
      }
    } catch (error: any) {
      log.error('Error executing AI-generated SQL', error, { 
        userId, 
        chatId, 
        sql: sql.substring(0, 100),
        params: params.length 
      });
      return null;
    }
  }

  /**
   * 🧠 ENHANCED RECURSIVE AI SYSTEM - AI decides when to stop
   */
  private async processEnhancedRecursiveAI(
    sqlResults: any,
    currentAiResponse: any,
    userId: string,
    chatId: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    originalUserMessage?: string,
    currentRecursionLevel: number = 1
  ): Promise<string> {
    try {
      const maxRecursions = currentAiResponse.maxRecursions || 1;
      
      log.info('🤖 ENHANCED RECURSIVE AI - LEVEL ' + currentRecursionLevel, {
        userId, chatId,
        currentLevel: currentRecursionLevel,
        maxRecursions,
        actionType: currentAiResponse.actionType,
        needsContinuation: currentAiResponse.needsContinuation,
        continuationPrompt: currentAiResponse.continuationPrompt?.substring(0, 50),
        sqlResultType: sqlResults ? (Array.isArray(sqlResults) ? `Array(${sqlResults.length})` : typeof sqlResults) : 'null'
      });

      // Get chat context
      const chatMembers = await this.getChatMembers(chatId);
      const isGroupChat = chatMembers.length > 2;
      const chatContext = isGroupChat ? 'GROUP CHAT' : 'PRIVATE CHAT';

      // Format SQL results for AI analysis
      const formattedData = sqlResults ? this.formatSqlResultsForAI(sqlResults, currentAiResponse.contextQuery?.expectedDataType) : "KHÔNG CÓ DỮ LIỆU SQL";

      // Create enhanced recursive prompt
      let recursivePrompt = '';
      
      if (currentAiResponse.needsContinuation && currentAiResponse.continuationPrompt) {
        // AI tự định hướng suy nghĩ tiếp theo
        recursivePrompt = `TIẾP TỤC SUY NGHĨ - Lần ${currentRecursionLevel}/${maxRecursions}

BẠN VỪA NÓI: "${currentAiResponse.response}"
BẠN MUỐN SUY NGHĨ THÊM VỀ: ${currentAiResponse.continuationPrompt}

NGỮ CẢNH:
- User gốc hỏi: "${originalUserMessage}"
- Chat type: ${chatContext}
- User đang hỏi: ${username || firstName || userId}
- Recursion level: ${currentRecursionLevel}/${maxRecursions}

DỮ LIỆU VỪA QUERY ĐƯỢC:
${formattedData}

YÊU CẦU:
- Tiếp tục suy nghĩ theo hướng bạn đã đề ra: "${currentAiResponse.continuationPrompt}"
- Bạn có thể:
  + Query thêm dữ liệu nếu cần (set needsContinuation=true)
  + Đưa ra phản hồi cuối cùng (set needsContinuation=false)
- Phản hồi tự nhiên, thân thiện như hầu gái với cảm xúc
- Sử dụng emotional intelligence để personalize response

Trả lời JSON format với đầy đủ các field, đặc biệt chú ý needsContinuation để quyết định có tiếp tục không.`;
      } else {
        // Fallback cho trường hợp legacy
        recursivePrompt = `RECURSIVE ANALYSIS - Bạn vừa tra cứu dữ liệu và nhận được kết quả.

NGỮ CẢNH:
- User gốc hỏi: "${originalUserMessage}"
- Chat type: ${chatContext}
- User đang hỏi: ${username || firstName || userId}
- Mục đích tra cứu: ${currentAiResponse.contextQuery?.purpose || 'Tìm thông tin liên quan'}

DỮ LIỆU VỪA QUERY ĐƯỢC:
${formattedData}

YÊU CẦU:
- Phân tích dữ liệu này và đưa ra phản hồi CUỐI CÙNG cho user
- Trả lời câu hỏi gốc của user dựa trên data vừa lấy được
- Phản hồi tự nhiên, thân thiện như hầu gái với cảm xúc
- KHÔNG tạo thêm SQL nữa - đây là phản hồi cuối cùng
- Nếu không có data phù hợp, thông báo một cách tự nhiên
- Sử dụng emotional intelligence để personalize response

Hãy trả lời JSON format với needsContinuation=false vì đây là lần cuối.`;
      }

      // Get AI's analysis
      const nextAiResponse = await this.geminiService.processMessage(
        recursivePrompt,
        chatMembers.map(m => m.username || m.firstName || m.userId),
        userId,
        chatId,
        username
      );

      if (!nextAiResponse.success) {
        log.warn('Recursive AI analysis failed', {
          userId, chatId,
          recursionLevel: currentRecursionLevel,
          error: nextAiResponse.error
        });
        return this.createFallbackResponse(sqlResults, currentAiResponse);
      }

      // Save intermediate AI response to conversation context
      if (nextAiResponse.response) {
        await this.conversationContext.saveBotResponse(chatId, userId, `[Thinking ${currentRecursionLevel}] ${nextAiResponse.response}`);
      }

      // Check if AI wants to continue and hasn't reached max recursions
      if (nextAiResponse.needsContinuation && currentRecursionLevel < maxRecursions) {
        log.info('🔄 AI WANTS TO CONTINUE', {
          userId, chatId,
          currentLevel: currentRecursionLevel,
          maxRecursions,
          continuationPrompt: nextAiResponse.continuationPrompt?.substring(0, 50)
        });

        // Execute SQL if AI generated one
        let nextSqlResult = null;
        if (nextAiResponse.sql && nextAiResponse.sqlParams) {
          nextSqlResult = await this.executeAIGeneratedSQL(
            nextAiResponse.sql,
            nextAiResponse.sqlParams,
            userId,
            chatId,
            username,
            nextAiResponse.actionType,
            firstName,
            lastName
          );
        }

        // Recurse to next level
        return await this.processEnhancedRecursiveAI(
          nextSqlResult,
          nextAiResponse,
          userId,
          chatId,
          username,
          firstName,
          lastName,
          originalUserMessage,
          currentRecursionLevel + 1
        );
      } else {
        // AI đã quyết định dừng hoặc đã đạt max recursions
        log.info('🎯 RECURSIVE AI COMPLETED', {
          userId, chatId,
          finalLevel: currentRecursionLevel,
          maxRecursions,
          reason: nextAiResponse.needsContinuation ? 'Max recursions reached' : 'AI decided to stop',
          finalResponseLength: nextAiResponse.response.length
        });

        return nextAiResponse.response;
      }

    } catch (error: any) {
      log.error('Error in enhanced recursive AI processing', error, { 
        userId, chatId,
        recursionLevel: currentRecursionLevel,
        sqlResultCount: sqlResults ? (Array.isArray(sqlResults) ? sqlResults.length : 1) : 0
      });
      
      return this.createFallbackResponse(sqlResults, currentAiResponse);
    }
  }

  /**
   * 🧠 LEGACY RECURSIVE AI QUERY SYSTEM - Kept for backward compatibility
   */
  private async processRecursiveAIQuery(
    sqlResults: any,
    originalAiResponse: any,
    userId: string,
    chatId: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    originalUserMessage?: string
  ): Promise<string> {
    try {
      log.info('🤖 STARTING RECURSIVE AI QUERY', {
        userId, chatId,
        actionType: originalAiResponse.actionType,
        sqlResultType: Array.isArray(sqlResults) ? `Array(${sqlResults.length})` : typeof sqlResults,
        contextQuery: originalAiResponse.contextQuery?.purpose,
        originalResponse: originalAiResponse.response.substring(0, 50) + '...'
      });

      // Get chat context
      const chatMembers = await this.getChatMembers(chatId);
      const isGroupChat = chatMembers.length > 2;
      const chatContext = isGroupChat ? 'GROUP CHAT' : 'PRIVATE CHAT';

      // Format SQL results for AI analysis
      const formattedData = this.formatSqlResultsForAI(sqlResults, originalAiResponse.contextQuery?.expectedDataType);

      // Create recursive prompt for AI to analyze the data
      const recursivePrompt = `RECURSIVE ANALYSIS - Bạn vừa tra cứu dữ liệu và nhận được kết quả.

NGỮ CẢNH:
- User gốc hỏi: "${originalUserMessage}"
- Chat type: ${chatContext}
- User đang hỏi: ${username || firstName || userId}
- Mục đích tra cứu: ${originalAiResponse.contextQuery?.purpose || 'Tìm thông tin liên quan'}

DỮ LIỆU VỪA QUERY ĐƯỢC:
${formattedData}

YÊU CẦU:
- Phân tích dữ liệu này và đưa ra phản hồi CUỐI CÙNG cho user
- Trả lời câu hỏi gốc của user dựa trên data vừa lấy được
- Phản hồi tự nhiên, thân thiện như hầu gái với cảm xúc
- KHÔNG tạo thêm SQL nữa - đây là phản hồi cuối cùng
- Nếu không có data phù hợp, thông báo một cách tự nhiên
- Sử dụng emotional intelligence để personalize response

Hãy trả lời trực tiếp, không cần JSON format, chỉ text response cho user.`;

      // Get AI's final analysis
      const finalAiResponse = await this.geminiService.processMessage(
        recursivePrompt,
        chatMembers.map(m => m.username || m.firstName || m.userId),
        userId,
        chatId,
        username
      );

      if (finalAiResponse.success && finalAiResponse.response) {
        // Save the final AI response to conversation context
        await this.conversationContext.saveBotResponse(chatId, userId, finalAiResponse.response);
        
        log.info('🎯 RECURSIVE AI ANALYSIS COMPLETED', {
          userId, chatId,
          originalQuery: originalUserMessage?.substring(0, 50),
          finalResponseLength: finalAiResponse.response.length,
          dataRecords: Array.isArray(sqlResults) ? sqlResults.length : 1
        });

        return finalAiResponse.response;
      } else {
        // Fallback to simple acknowledgment if AI analysis fails
        log.warn('Recursive AI analysis failed, using fallback', {
          userId, chatId,
          error: finalAiResponse.error
        });
        return this.createFallbackResponse(sqlResults, originalAiResponse);
      }

    } catch (error: any) {
      log.error('Error in recursive AI query processing', error, { 
        userId, chatId,
        sqlResultCount: Array.isArray(sqlResults) ? sqlResults.length : 1
      });
      
      return this.createFallbackResponse(sqlResults, originalAiResponse);
    }
  }

  /**
   * 🛠️ Update or create chat member
   */
  private async updateChatMember(
    chatId: string, 
    userId: string, 
    username?: string, 
    firstName?: string, 
    lastName?: string
  ): Promise<void> {
    try {
      const existingMember = await this.database.query(
        'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId]
      );

      if (existingMember.length > 0) {
        await this.database.query(
          'UPDATE chat_members SET username = $3, first_name = $4, last_name = $5, last_seen = NOW() WHERE chat_id = $1 AND user_id = $2',
          [chatId, userId, username || null, firstName || null, lastName || null]
        );
      } else {
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
   * 📋 Get chat members
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
   * 📊 Format SQL results for AI analysis based on data type
   */
  private formatSqlResultsForAI(sqlResults: any, expectedDataType?: string): string {
    if (!sqlResults) {
      return "KHÔNG CÓ DỮ LIỆU";
    }

    if (!Array.isArray(sqlResults)) {
      return `SINGLE RESULT: ${JSON.stringify(sqlResults, null, 2)}`;
    }

    if (sqlResults.length === 0) {
      return "DANH SÁCH TRỐNG - không có dữ liệu nào được tìm thấy";
    }

    switch (expectedDataType) {
      case 'conversation_history':
        return `LỊCH SỬ CHAT (${sqlResults.length} tin nhắn):
${sqlResults.map((msg, idx) => 
  `${idx + 1}. [${msg.timestamp}] ${msg.message_type === 'user' ? msg.user_id || 'User' : 'Bot'}: ${msg.content}`
).join('\n')}`;

      case 'debt_list':
        return `DANH SÁCH NỢ (${sqlResults.length} records):
${sqlResults.map((debt, idx) => 
  `${idx + 1}. ${debt.debtor_username} nợ ${debt.creditor_username}: ${debt.amount} VND (${debt.description || 'không rõ'})${debt.debt_count ? ` - Tổng ${debt.debt_count} lần nợ` : ''}`
).join('\n')}`;

      case 'user_preferences':
      case 'user_identity':
      case 'food_profile':
        return `THÔNG TIN USER (${sqlResults.length} records):
${sqlResults.map((user, idx) => 
  `${idx + 1}. ${JSON.stringify(user, null, 2)}`
).join('\n\n')}`;

      case 'emotional_state':
        return `TRẠNG THÁI CẢM XÚC BOT (${sqlResults.length} records):
${sqlResults.map((emotion, idx) => 
  `${idx + 1}. Mood: ${emotion.current_mood}, Intensity: ${emotion.mood_intensity}, Trigger: ${emotion.emotional_trigger || 'không rõ'}`
).join('\n')}`;

      case 'relationship_data':
        return `DỮ LIỆU MỐI QUAN HỆ (${sqlResults.length} records):
${sqlResults.map((rel, idx) => 
  `${idx + 1}. Affection: ${rel.affection_level}, Trust: ${rel.trust_level}, Style: ${rel.communication_style}, Memories: ${rel.special_memories || 'chưa có'}`
).join('\n')}`;

      default:
        return `DỮ LIỆU TỔNG QUÁT (${sqlResults.length} records):
${sqlResults.map((item, idx) => 
  `${idx + 1}. ${JSON.stringify(item, null, 2)}`
).join('\n\n')}`;
    }
  }

  /**
   * 🔄 Create fallback response when AI analysis fails
   */
  private createFallbackResponse(sqlResults: any, originalAiResponse: any): string {
    // Generate dynamic fallback based on context instead of hardcoding
    const resultCount = Array.isArray(sqlResults) ? sqlResults.length : (sqlResults ? 1 : 0);
    const dataType = originalAiResponse.contextQuery?.expectedDataType;
    
    if (!sqlResults || resultCount === 0) {
      // Return a simple, non-hardcoded failure message
      return Math.random() > 0.5 
        ? "Hmm không tìm thấy gì liên quan nè"
        : "À không có thông tin gì hết á";
    }
    
    // Generate varied responses based on data type and count
    const responseTemplates = {
      'debt_list': [
        `Có ${resultCount} khoản nợ nhưng không parse được, hỏi cụ thể hơn đi a`,
        `Tìm được ${resultCount} record nợ nhưng phân tích lỗi, thử lại đi`
      ],
      'conversation_history': [
        `Có ${resultCount} tin nhắn cũ nhưng tóm tắt không được, hỏi khác đi`,
        `${resultCount} messages nhưng analyze fail, câu hỏi khác nhé`
      ],
      'default': [
        `Tìm được ${resultCount} kết quả nhưng xử lý lỗi`,
        `Có ${resultCount} records nhưng parse không được`
      ]
    };
    
    const templates = responseTemplates[dataType] || responseTemplates['default'];
    return templates[Math.floor(Math.random() * templates.length)];
  }
}