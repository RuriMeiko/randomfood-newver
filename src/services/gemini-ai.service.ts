import { log } from '@/utils/logger';
import { buildCompleteSystemPrompt, DEFAULT_SERVICE_CONFIG } from '@/prompts/service-orchestrator';
import { ConversationContextService } from './conversation-context.service';

export interface MessageConfig {
  shouldSplit: boolean;
  messages: string[];
  delays: number[];
  typingDuration: number;
}

export interface GeminiAIResponse {
  actionType: 'food_suggestion' | 'debt_tracking' | 'conversation' | 'context_query' | 'error';
  response: string;
  messageConfig?: MessageConfig;
  sql?: string | null;
  sqlParams?: any[] | null;
  needsRecursion?: boolean; // Indicates if AI needs to query more data before final response
  needsContinuation?: boolean; // NEW: AI decides if it wants to continue the conversation
  continuationPrompt?: string; // NEW: What AI wants to think about next
  maxRecursions?: number; // NEW: How many more times AI wants to recurse (default 1)
  contextQuery?: {
    purpose: string; // Why AI needs this data
    expectedDataType: 'conversation_history' | 'debt_list' | 'user_info' | 'group_members' | 'emotional_state' | 'relationship_data' | 'user_preferences' | 'user_identity' | 'food_profile';
  };
  data?: {
    // For food suggestions
    foodName?: string;
    description?: string;
    ingredients?: string[];
    tips?: string;
    
    // For debt tracking
    debtorUsername?: string;
    creditorUsername?: string;
    amount?: number;
    currency?: string;
    description?: string;
    action?: 'create' | 'pay' | 'list' | 'check';
    
    // For conversation
    conversationResponse?: string;
    
    // For context queries
    queryPurpose?: string;
    followUpAction?: string;
  };
  success: boolean;
  error?: string;
}

export class GeminiAIService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private conversationContext: ConversationContextService;

  constructor(apiKey: string, conversationContext: ConversationContextService) {
    this.apiKey = apiKey;
    this.conversationContext = conversationContext;
  }

  /**
   * Process user message with Gemini AI to determine action and response
   */
  async processMessage(
    userMessage: string, 
    chatMembers: string[], 
    userId: string,
    chatId: string,
    username?: string,
    context?: any,
    telegramData?: {
      messageId?: number;
      firstName?: string;
      lastName?: string;
      date?: number;
      fullTelegramObject?: any;
    }
  ): Promise<GeminiAIResponse> {
    try {
      // Tạo context string từ conversation history
      let contextString = '';
      if (context && (context.messages.length > 0 || context.summaries.length > 0)) {
        contextString = this.conversationContext.createContextForAI(context.messages, context.summaries);
        
        log.debug('Using conversation context', {
          userId, chatId,
          messageCount: context.messages.length,
          summaryCount: context.summaries.length,
          totalTokens: context.totalTokens,
          contextStatus: context.contextStatus
        });
      }

      // Build system prompt với service orchestrator
      const systemPrompt = buildCompleteSystemPrompt(chatMembers, userId, username, DEFAULT_SERVICE_CONFIG);
      
      // Prepare enriched context for AI
      let enrichedContextString = '';
      
      // Add user information from memory if available
      if (context?.userInfo) {
        enrichedContextString += `\nTHÔNG TIN USER ĐÃ LƯU:\n`;
        if (context.userInfo.hasStoredMemory && context.userInfo.availableInfo) {
          const info = context.userInfo.availableInfo;
          enrichedContextString += `- Tên thật: ${info.realName || 'chưa có'}\n`;
          enrichedContextString += `- Tên gọi: ${info.preferredName || 'chưa có'}\n`;
          
          if (info.aliases && Array.isArray(info.aliases)) {
            enrichedContextString += `- Biệt danh: [${info.aliases.join(', ')}]\n`;
          }
          
          if (info.personalInfo) {
            enrichedContextString += `- Thông tin cá nhân: ${JSON.stringify(info.personalInfo)}\n`;
          }
          
          if (info.foodPreferences) {
            enrichedContextString += `- Sở thích ăn uống: ${JSON.stringify(info.foodPreferences)}\n`;
          }
          
          if (info.eatingHabits) {
            enrichedContextString += `- Thói quen ăn uống: ${JSON.stringify(info.eatingHabits)}\n`;
          }
          
          if (info.personalityTraits) {
            enrichedContextString += `- Tính cách: ${JSON.stringify(info.personalityTraits)}\n`;
          }
          
          if (info.interests && Array.isArray(info.interests)) {
            enrichedContextString += `- Sở thích: [${info.interests.join(', ')}]\n`;
          }
          
          if (info.communicationStyle) {
            enrichedContextString += `- Phong cách giao tiếp: ${info.communicationStyle}\n`;
          }
        } else {
          enrichedContextString += `- User mới chưa có thông tin được lưu\n`;
          if (context.userInfo.chatMember) {
            const member = context.userInfo.chatMember;
            enrichedContextString += `- Thông tin cơ bản từ chat: ${member.username || member.firstName || 'không rõ tên'}\n`;
          }
        }
      }
      
      if (context?.debtData) {
        enrichedContextString += `\nDỮ LIỆU NỢ HIỆN TẠI:\n`;
        enrichedContextString += `- Số dư của ${username}: ${context.debtData.summary.netBalance > 0 ? `+${context.debtData.summary.netBalance}k (người ta nợ bạn)` : context.debtData.summary.netBalance < 0 ? `${context.debtData.summary.netBalance}k (bạn nợ người ta)` : '0k (không nợ ai)'}\n`;
        enrichedContextString += `- Tổng bạn nợ người khác: ${context.debtData.summary.totalOwed}k\n`;
        enrichedContextString += `- Tổng người khác nợ bạn: ${context.debtData.summary.totalLent}k\n`;
        
        if (context.debtData.unpaidDebts.length > 0) {
          enrichedContextString += `- Nợ chưa trả:\n`;
          context.debtData.unpaidDebts.slice(0, 5).forEach((debt: any) => {
            enrichedContextString += `  + ${debt.debtorUsername} nợ ${debt.creditorUsername} ${debt.amount}k: ${debt.description}\n`;
          });
        }
      }
      
      if (context?.foodData) {
        enrichedContextString += `\nLỊCH SỬ ĐỒ ĂN:\n`;
        if (context.foodData.userHistory.length > 0) {
          enrichedContextString += `- Món đã gợi ý cho ${username}:\n`;
          context.foodData.userHistory.slice(0, 3).forEach((food: any) => {
            enrichedContextString += `  + ${food.suggestion} (${new Date(food.createdAt).toLocaleDateString()})\n`;
          });
        }
        if (context.foodData.chatHistory.length > 0) {
          enrichedContextString += `- Món group đã thử gần đây:\n`;
          context.foodData.chatHistory.slice(0, 3).forEach((food: any) => {
            enrichedContextString += `  + ${food.suggestion} - ${food.username}\n`;
          });
        }
      }

      if (context?.aliasData) {
        enrichedContextString += `\nHỆ THỐNG BIỆT DANH:\n`;
        enrichedContextString += `- Danh sách người đã map biệt danh:\n`;
        context.aliasData.knownAliases.slice(0, 5).forEach((alias: any) => {
          enrichedContextString += `  + ${alias.realName}: [${alias.aliases.join(', ')}]`;
          if (alias.confidence < 1.0) {
            enrichedContextString += ` (confidence: ${(alias.confidence * 100).toFixed(0)}%)`;
          }
          enrichedContextString += `\n`;
        });
        enrichedContextString += `\nQUY TẮC SỬ DỤNG BIỆT DANH:\n`;
        enrichedContextString += `- Khi đề cập người nào, dùng TÊN THẬT thay vì biệt danh\n`;
        enrichedContextString += `- Nếu biệt danh không rõ ràng (có nhiều người), hỏi để xác nhận\n`;
        enrichedContextString += `- Khi tạo debt record, dùng tên thật để tránh nhầm lẫn\n`;
      }
      
      // Prepare comprehensive Telegram context for AI user identification
      let telegramContextString = '';
      if (telegramData) {
        telegramContextString += `\n🤖 TELEGRAM USER IDENTIFICATION DATA:\n`;
        telegramContextString += `- User ID: ${userId} (unique identifier)\n`;
        telegramContextString += `- Chat ID: ${chatId}\n`;
        telegramContextString += `- Username: @${username || 'N/A'}\n`;
        telegramContextString += `- First Name: ${telegramData.firstName || 'N/A'}\n`;
        telegramContextString += `- Last Name: ${telegramData.lastName || 'N/A'}\n`;
        telegramContextString += `- Message ID: ${telegramData.messageId || 'N/A'}\n`;
        telegramContextString += `- Message Date: ${telegramData.date ? new Date(telegramData.date * 1000).toISOString() : 'N/A'}\n`;
        
        // Enhanced Telegram object information for AI identification
        if (telegramData.fullTelegramObject) {
          telegramContextString += `\n📋 COMPLETE TELEGRAM MESSAGE OBJECT:\n`;
          telegramContextString += `${JSON.stringify(telegramData.fullTelegramObject, null, 2)}\n`;
          
          // Extract additional useful info for AI
          const from = telegramData.fullTelegramObject.from;
          if (from) {
            telegramContextString += `\n👤 SENDER DETAILS FROM TELEGRAM:\n`;
            telegramContextString += `- ID: ${from.id}\n`;
            telegramContextString += `- Is Bot: ${from.is_bot || false}\n`;
            telegramContextString += `- First Name: ${from.first_name || 'N/A'}\n`;
            telegramContextString += `- Last Name: ${from.last_name || 'N/A'}\n`;
            telegramContextString += `- Username: @${from.username || 'N/A'}\n`;
            telegramContextString += `- Language Code: ${from.language_code || 'N/A'}\n`;
            if (from.is_premium) telegramContextString += `- Telegram Premium: Yes\n`;
          }
          
          const chat = telegramData.fullTelegramObject.chat;
          if (chat) {
            telegramContextString += `\n💬 CHAT DETAILS FROM TELEGRAM:\n`;
            telegramContextString += `- Chat ID: ${chat.id}\n`;
            telegramContextString += `- Chat Type: ${chat.type}\n`;
            telegramContextString += `- Chat Title: ${chat.title || 'N/A'}\n`;
            if (chat.username) telegramContextString += `- Chat Username: @${chat.username}\n`;
            if (chat.description) telegramContextString += `- Chat Description: ${chat.description}\n`;
          }
        }
        
        telegramContextString += `\n💡 AI INSTRUCTION: Sử dụng User ID ${userId} để xác định chính xác người đang chat. Kết hợp với thông tin từ user_memory table để cá nhân hóa phản hồi.\n`;
      }

      const requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}

${contextString ? `LỊCH SỬ CUỘC TRÒ CHUYỆN:\n${contextString}\n` : ''}

${enrichedContextString}

${telegramContextString}

USER MESSAGE MỚI: "${userMessage}"

Phân tích message và trả về JSON theo format đã định nghĩa ở trên.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 4000,
        }
      };

      // LOG DETAILED AI INPUT
      log.info('🤖 GEMINI AI INPUT DETAILED LOG', {
        userId, chatId,
        userMessage: userMessage,
        chatMembers: chatMembers,
        username: username,
        systemPrompt: systemPrompt.substring(0, 200) + '...',
        contextString: contextString.substring(0, 300) + (contextString.length > 300 ? '...' : ''),
        enrichedContextString: enrichedContextString.substring(0, 500) + (enrichedContextString.length > 500 ? '...' : ''),
        telegramContextString: telegramContextString.substring(0, 400) + (telegramContextString.length > 400 ? '...' : ''),
        fullPromptLength: `${systemPrompt}\n\n${contextString ? `LỊCH SỬ CUỘC TRÒ CHUYỆN:\n${contextString}\n` : ''}\n${enrichedContextString}\n${telegramContextString}\nUSER MESSAGE MỚI: "${userMessage}"\n\nPhân tích message và trả về JSON theo format đã định nghĩa ở trên.`.length,
        requestConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 4000
        }
      });

      log.debug('🔍 COMPLETE AI INPUT PROMPT', {
        userId, chatId,
        fullPrompt: `${systemPrompt}\n\n${contextString ? `LỊCH SỬ CUỘC TRÒ CHUYỆN:\n${contextString}\n` : ''}\n${enrichedContextString}\n${telegramContextString}\nUSER MESSAGE MỚI: "${userMessage}"\n\nPhân tích message và trả về JSON theo format đã định nghĩa ở trên.`
      });

      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        log.error('Gemini AI API error', undefined, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          processingTime
        });
        return {
          actionType: 'error',
          response: Math.random() > 0.5 ? 'Ơi lỗi rồi, thử lại đi a' : 'Có vấn đề gì đó, retry xem',
          success: false,
          error: `API Error: ${response.status}`
        };
      }

      const data = await response.json();
      
      // LOG RAW AI RESPONSE
      log.info('🤖 GEMINI AI RAW RESPONSE', {
        userId, chatId, processingTime,
        responseStatus: response.status,
        responseOk: response.ok,
        candidatesCount: data.candidates?.length || 0,
        fullResponse: data,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      
      if (!data.candidates || data.candidates.length === 0) {
        log.error('❌ No candidates in Gemini response', undefined, { 
          userId, chatId, processingTime,
          response: data,
          requestBody: requestBody
        });
        return {
          actionType: 'error',
          response: Math.random() > 0.5 ? 'AI không rep gì hết á' : 'Lỗi AI rồi, thử lại nha',
          success: false,
          error: 'No AI response generated'
        };
      }

      const aiResponseText = data.candidates[0]?.content?.parts[0]?.text || '';
      
      // LOG AI RESPONSE TEXT
      log.info('📝 GEMINI AI RESPONSE TEXT', {
        userId, chatId, processingTime,
        responseLength: aiResponseText.length,
        responseText: aiResponseText,
        finishReason: data.candidates[0]?.finishReason,
        safetyRatings: data.candidates[0]?.safetyRatings
      });
      
      if (!aiResponseText.trim()) {
        log.error('❌ Empty response from Gemini', undefined, { 
          userId, chatId, processingTime,
          data: data,
          candidate: data.candidates[0]
        });
        return {
          actionType: 'error',
          response: Math.random() > 0.5 ? 'AI rep trống không à' : 'Response rỗng, lỗi rồi',
          success: false,
          error: 'Empty AI response'
        };
      }

      // Parse JSON response from AI
      try {
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          log.error('❌ No JSON found in AI response', undefined, { 
            userId, chatId, processingTime,
            aiResponseText: aiResponseText,
            responseLength: aiResponseText.length
          });
          return {
            actionType: 'conversation',
            response: aiResponseText,
            data: { conversationResponse: aiResponseText },
            success: true
          };
        }

        log.info('🔍 JSON EXTRACTION FROM AI RESPONSE', {
          userId, chatId,
          extractedJson: jsonMatch[0],
          originalTextLength: aiResponseText.length,
          jsonLength: jsonMatch[0].length
        });

        const aiResponse = JSON.parse(jsonMatch[0]);
        
        // LOG DETAILED PARSED RESPONSE
        log.info('✅ GEMINI AI PARSED OUTPUT', {
          userId, chatId, processingTime,
          rawAiText: aiResponseText,
          extractedJson: jsonMatch[0],
          parsedResponse: aiResponse,
          outputAnalysis: {
            actionType: aiResponse.actionType,
            response: aiResponse.response,
            responseLength: aiResponse.response?.length || 0,
            hasSQL: !!aiResponse.sql,
            sql: aiResponse.sql,
            sqlParams: aiResponse.sqlParams,
            sqlParamCount: aiResponse.sqlParams ? aiResponse.sqlParams.length : 0,
            hasMessageConfig: !!aiResponse.messageConfig,
            messageConfig: aiResponse.messageConfig,
            hasData: !!aiResponse.data,
            data: aiResponse.data,
            dataKeys: aiResponse.data ? Object.keys(aiResponse.data) : [],
            needsRecursion: aiResponse.needsRecursion,
            needsContinuation: aiResponse.needsContinuation,
            continuationPrompt: aiResponse.continuationPrompt,
            maxRecursions: aiResponse.maxRecursions,
            contextQuery: aiResponse.contextQuery
          }
        });
        
        // Validate that we have the required response field
        if (!aiResponse.response) {
          log.error('❌ No response field in AI JSON', undefined, { 
            userId, chatId, processingTime,
            aiResponse: aiResponse,
            rawText: aiResponseText
          });
          return {
            actionType: 'conversation',
            response: aiResponseText,
            data: { conversationResponse: aiResponseText },
            success: true
          };
        }

        // AI tự quyết định messageConfig, không cần auto-generate
        let messageConfig = aiResponse.messageConfig || null;

        // Prepare final response object
        const finalResponse = {
          actionType: aiResponse.actionType || 'conversation',
          response: aiResponse.response, // This is the clean text response
          sql: aiResponse.sql || null,
          sqlParams: aiResponse.sqlParams || null,
          messageConfig: messageConfig,
          data: aiResponse.data || {},
          needsRecursion: aiResponse.needsRecursion,
          needsContinuation: aiResponse.needsContinuation,
          continuationPrompt: aiResponse.continuationPrompt,
          maxRecursions: aiResponse.maxRecursions,
          contextQuery: aiResponse.contextQuery,
          success: true
        };

        // LOG FINAL SUCCESS OUTPUT
        log.info('🎉 GEMINI AI PROCESSING COMPLETED SUCCESSFULLY', { 
          userId, chatId, processingTime,
          finalOutput: finalResponse,
          summary: {
            actionType: finalResponse.actionType,
            responseLength: finalResponse.response?.length || 0,
            hasSQL: !!finalResponse.sql,
            sqlType: finalResponse.sql ? (finalResponse.sql.toLowerCase().includes('select') ? 'SELECT' : 
                     finalResponse.sql.toLowerCase().includes('insert') ? 'INSERT' :
                     finalResponse.sql.toLowerCase().includes('update') ? 'UPDATE' :
                     finalResponse.sql.toLowerCase().includes('delete') ? 'DELETE' : 'OTHER') : null,
            sqlParamCount: finalResponse.sqlParams?.length || 0,
            hasMessageConfig: !!finalResponse.messageConfig,
            shouldSplit: finalResponse.messageConfig?.shouldSplit || false,
            messageCount: finalResponse.messageConfig?.messages?.length || 0,
            hasData: !!finalResponse.data && Object.keys(finalResponse.data).length > 0,
            dataKeys: finalResponse.data ? Object.keys(finalResponse.data) : [],
            needsRecursion: finalResponse.needsRecursion || false,
            needsContinuation: finalResponse.needsContinuation || false,
            hasContextQuery: !!finalResponse.contextQuery
          }
        });

        // Return the parsed response with proper structure
        return finalResponse;

      } catch (parseError: any) {
        log.error('❌ ERROR PARSING AI JSON RESPONSE', parseError, { 
          userId, chatId, processingTime,
          parseErrorMessage: parseError.message,
          parseErrorStack: parseError.stack,
          aiResponseText: aiResponseText,
          aiResponseLength: aiResponseText.length,
          attemptedJsonExtraction: aiResponseText.match(/\{[\s\S]*\}/)?.[0] || 'No JSON found'
        });
        
        // LOG FALLBACK ACTION
        log.info('🔄 FALLING BACK TO CONVERSATION MODE', {
          userId, chatId,
          reason: 'JSON parsing failed',
          fallbackResponse: aiResponseText.substring(0, 100) + '...'
        });
        
        // Fallback to treating as conversation
        return {
          actionType: 'conversation',
          response: aiResponseText,
          data: { conversationResponse: aiResponseText },
          success: true
        };
      }

    } catch (error: any) {
      log.error('❌ CRITICAL ERROR IN GEMINI AI SERVICE', error, {
        userId, chatId,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        userMessage: userMessage,
        chatMembersCount: chatMembers.length,
        hasContext: !!context,
        contextLength: contextString?.length || 0,
        enrichedContextLength: enrichedContextString?.length || 0,
        telegramContextLength: telegramContextString?.length || 0,
        requestUrl: `${this.baseUrl}?key=[HIDDEN]`,
        timestamp: new Date().toISOString()
      });
      
      // LOG ERROR RESPONSE
      log.info('💥 RETURNING ERROR RESPONSE TO USER', {
        userId, chatId,
        errorType: 'ai_service_failure',
        originalError: error.message
      });
      
      return {
        actionType: 'error',
        response: Math.random() > 0.5 ? 'Connect AI lỗi rồi, thử lại đi' : 'Mạng có vấn đề, retry nha',
        success: false,
        error: error.message
      };
    }
  }


}