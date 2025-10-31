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
      
      // Prepare Telegram context for AI
      let telegramContextString = '';
      if (telegramData) {
        telegramContextString += `\nTELEGRAM CONTEXT:\n`;
        telegramContextString += `- User ID: ${userId}\n`;
        telegramContextString += `- Chat ID: ${chatId}\n`;
        telegramContextString += `- Username: ${username || 'N/A'}\n`;
        telegramContextString += `- First Name: ${telegramData.firstName || 'N/A'}\n`;
        telegramContextString += `- Last Name: ${telegramData.lastName || 'N/A'}\n`;
        telegramContextString += `- Message ID: ${telegramData.messageId || 'N/A'}\n`;
        telegramContextString += `- Message Date: ${telegramData.date ? new Date(telegramData.date * 1000).toISOString() : 'N/A'}\n`;
        
        if (telegramData.fullTelegramObject) {
          telegramContextString += `- Full Telegram Object: ${JSON.stringify(telegramData.fullTelegramObject, null, 2)}\n`;
        }
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
          maxOutputTokens: 1000,
        }
      };

      log.debug('Calling Gemini AI for message processing', { 
        messageLength: userMessage.length,
        memberCount: chatMembers.length,
        userId,
        chatId,
        hasContext: !!contextString,
        contextLength: contextString.length,
        totalTokens: context?.totalTokens || 0
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
          response: 'Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn.',
          success: false,
          error: `API Error: ${response.status}`
        };
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        log.error('No candidates in Gemini response', undefined, { response: data, processingTime });
        return {
          actionType: 'error',
          response: 'Không thể xử lý tin nhắn của bạn lúc này.',
          success: false,
          error: 'No AI response generated'
        };
      }

      const aiResponseText = data.candidates[0]?.content?.parts[0]?.text || '';
      
      if (!aiResponseText.trim()) {
        log.error('Empty response from Gemini', undefined, { data, processingTime });
        return {
          actionType: 'error',
          response: 'Phản hồi từ AI bị trống.',
          success: false,
          error: 'Empty AI response'
        };
      }

      // Parse JSON response from AI
      try {
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          log.error('No JSON found in AI response', undefined, { aiResponseText, processingTime });
          return {
            actionType: 'conversation',
            response: aiResponseText,
            data: { conversationResponse: aiResponseText },
            success: true
          };
        }

        const aiResponse = JSON.parse(jsonMatch[0]);
        
        // LOG CHI TIẾT RESPONSE TỪ GEMINI
        log.info('🤖 GEMINI RESPONSE DEBUG', {
          userId, chatId, processingTime,
          rawAiText: aiResponseText.substring(0, 200),
          parsedResponse: {
            actionType: aiResponse.actionType,
            response: aiResponse.response,
            hasSQL: !!aiResponse.sql,
            sqlPreview: aiResponse.sql ? aiResponse.sql.substring(0, 50) + '...' : null,
            sqlParamCount: aiResponse.sqlParams ? aiResponse.sqlParams.length : 0,
            hasMessageConfig: !!aiResponse.messageConfig,
            messageConfig: aiResponse.messageConfig,
            hasData: !!aiResponse.data,
            dataKeys: aiResponse.data ? Object.keys(aiResponse.data) : []
          }
        });
        
        // Validate that we have the required response field
        if (!aiResponse.response) {
          log.error('No response field in AI JSON', undefined, { aiResponse, processingTime });
          return {
            actionType: 'conversation',
            response: aiResponseText,
            data: { conversationResponse: aiResponseText },
            success: true
          };
        }

        log.info('Gemini AI response processed successfully', { 
          actionType: aiResponse.actionType,
          responseLength: aiResponse.response?.length || 0,
          processingTime,
          userId,
          chatId,
          hasContext: !!contextString,
          messageConfigPresent: !!aiResponse.messageConfig,
          shouldSplit: aiResponse.messageConfig?.shouldSplit || false
        });

        // Auto-generate messageConfig if AI didn't provide one
        let messageConfig = aiResponse.messageConfig;
        if (!messageConfig) {
          log.warn('Gemini không trả về messageConfig, tự động tạo', {
            userId, chatId,
            responseLength: aiResponse.response?.length || 0,
            actionType: aiResponse.actionType
          });
          
          // Tự động quyết định có nên chia tin nhắn không
          const shouldAutoSplit = this.shouldAutoSplitMessage(aiResponse.response, aiResponse.actionType);
          
          if (shouldAutoSplit) {
            messageConfig = this.createAutoMessageConfig(aiResponse.response, aiResponse.actionType);
            log.info('Đã tạo messageConfig tự động', {
              userId, chatId,
              shouldSplit: messageConfig.shouldSplit,
              messageCount: messageConfig.messages.length,
              actionType: aiResponse.actionType
            });
          }
        }

        // Return the parsed response with proper structure
        return {
          actionType: aiResponse.actionType || 'conversation',
          response: aiResponse.response, // This is the clean text response
          sql: aiResponse.sql || null,
          sqlParams: aiResponse.sqlParams || null,
          messageConfig: messageConfig,
          data: aiResponse.data || {},
          success: true
        };

      } catch (parseError: any) {
        log.error('Error parsing AI JSON response', parseError, { 
          aiResponseText: aiResponseText.substring(0, 200),
          processingTime 
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
      log.error('Error calling Gemini AI', error, {
        errorMessage: error.message,
        errorStack: error.stack,
        userId
      });
      
      return {
        actionType: 'error',
        response: 'Có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Tự động quyết định có nên chia tin nhắn không (theo luật 20 từ)
   */
  private shouldAutoSplitMessage(response: string, actionType: string): boolean {
    if (!response) return false;
    
    // Đếm số từ thay vì ký tự
    const wordCount = response.trim().split(/\s+/).length;
    
    // Chỉ gửi 1 tin nếu THẬT NGẮN (<10 từ) và là xác nhận đơn giản
    if (wordCount < 10 && (
      response.match(/^(ok|được|ừm|chào|hi|hello|bye|cảm ơn|thanks)/i) ||
      actionType === 'confirmation'
    )) {
      return false;
    }
    
    // Tất cả các trường hợp khác đều chia nhỏ
    return true;
  }
  
  /**
   * Tự động tạo messageConfig cho response (theo luật 20 từ/tin)
   */
  private createAutoMessageConfig(response: string, actionType: string): MessageConfig {
    // Hàm helper để chia text thành chunks 20 từ
    const splitIntoChunks = (text: string, maxWords: number = 20): string[] => {
      const words = text.trim().split(/\s+/);
      const chunks: string[] = [];
      
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
      }
      
      return chunks;
    };
    
    if (actionType === 'food_suggestion') {
      // Chia food suggestion với prefix tự nhiên
      const mainContent = splitIntoChunks(response, 30); // Để lại chỗ cho prefix
      const messageCount = 2 + mainContent.length;
      return {
        shouldSplit: true,
        messages: [
          ...mainContent,
        ].filter(m => m.length > 1),
        delays: Array(messageCount).fill(0).map(() => 
          Math.floor(Math.random() * 600) + 800 // 0.8-1.4s random
        ),
        typingDuration: 800 // Giảm typing time
      };
    }
    
    if (actionType === 'debt_tracking') {
      // Chia debt tracking
      const mainContent = splitIntoChunks(response, 15);
      const messageCount = 1 + mainContent.length;
      return {
        shouldSplit: true,
        messages: [
          'Để em check lại...',
          ...mainContent
        ],
        delays: Array(messageCount).fill(0).map(() => 
          Math.floor(Math.random() * 400) + 600 // 0.6-1.0s random
        ),
        typingDuration: 600
      };
    }
    
    // Conversation - chia thành chunks 20 từ
    const chunks = splitIntoChunks(response, 20);
    
    if (chunks.length === 1) {
      // Nếu vẫn chỉ 1 chunk, có thể chia theo dấu chấm
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 1) {
        const shortChunks = sentences.map(s => {
          const words = s.trim().split(/\s+/);
          return words.length > 20 ? splitIntoChunks(s.trim(), 20) : [s.trim()];
        }).flat();
        
        return {
          shouldSplit: true,
          messages: shortChunks,
          delays: Array(shortChunks.length).fill(0).map(() => 
            Math.floor(Math.random() * 500) + 600 // 0.6-1.1s random
          ),
          typingDuration: 700
        };
      }
    }
    
    // Multiple chunks
    return {
      shouldSplit: true,
      messages: chunks,
      delays: Array(chunks.length).fill(0).map(() => 
        Math.floor(Math.random() * 500) + 600 // 0.6-1.1s random  
      ),
      typingDuration: 700
    };
  }

}