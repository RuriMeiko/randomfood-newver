import { log } from '@/utils/logger';
import { buildSystemPrompt } from '@/prompts/system-prompt';
import { ConversationContextService } from './conversation-context.service';

export interface MessageConfig {
  shouldSplit: boolean;
  messages: string[];
  delays: number[];
  typingDuration: number;
}

export interface GeminiAIResponse {
  actionType: 'food_suggestion' | 'debt_tracking' | 'conversation' | 'error';
  response: string;
  messageConfig?: MessageConfig;
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
    context?: any
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

      // Build system prompt với conversation context
      const systemPrompt = buildSystemPrompt(chatMembers, userId, username, context?.messages || []);
      
      const requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}

${contextString ? `LỊCH SỬ CUỘC TRÒ CHUYỆN:\n${contextString}\n` : ''}

USER MESSAGE MỚI: "${userMessage}"

Dựa trên ${contextString ? 'lịch sử và ' : ''}tin nhắn mới, phân tích và trả về JSON:
{
  "actionType": "food_suggestion" | "debt_tracking" | "conversation",
  "response": "Câu trả lời tự nhiên như con người nhắn tin, KHÔNG emoji",
  "messageConfig": {
    "shouldSplit": true/false,
    "messages": ["Tin nhắn 1", "Tin nhắn 2", "Tin nhắn 3..."],
    "delays": [1000, 2000, 1500],
    "typingDuration": 2000
  },
  "data": {
    // Nếu là food_suggestion:
    "foodName": "Tên món ăn",
    "description": "Cách làm đơn giản cho sinh viên",
    "ingredients": ["Nguyên liệu dễ kiếm, rẻ"],
    "tips": "Mẹo nấu nướng"
    
    // Nếu là debt_tracking:
    "debtorUsername": "Người nợ",
    "creditorUsername": "Người cho vay", 
    "amount": số tiền,
    "currency": "VND",
    "description": "Mô tả khoản nợ",
    "action": "create" | "pay" | "list" | "check"
    
    // Nếu là conversation:
    "conversationResponse": "Phản hồi tự nhiên"
  }
}

VÍ DỤ response cho food_suggestion:
"Thử làm mì tôm trứng đi bạn. Đun nước sôi cho mì vào, đập trứng vào lúc sắp chín. Thêm chút rau cải hoặc hành lá cho đẹp mắt. Vừa nhanh vừa no bụng."

VÍ DỤ response cho conversation:
"Chào bạn! Hôm nay thế nào rồi?"

KHÔNG được dùng emoji, không formal, viết như tin nhắn bạn bè`
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
      const mainContent = splitIntoChunks(response, 15); // Để lại chỗ cho prefix
      const messageCount = 2 + mainContent.length;
      return {
        shouldSplit: true,
        messages: [
          'Ờ để em nghĩ cái...',
          ...mainContent,
          'Dễ mà ngon đó bạn!'
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

  /**
   * Build system prompt for Gemini AI
   */
  private buildSystemPrompt(chatMembers: string[], userId: string, username?: string): string {
    return `Bạn là một AI bot thông minh hỗ trợ người Việt Nam trong group chat Telegram. Nhiệm vụ chính:

1. RANDOM MÓN ĂN: Gợi ý món ăn Việt Nam ngon, dễ làm
2. GHI NỢ: Theo dõi các khoản nợ giữa thành viên nhóm  
3. TRÒ CHUYỆN: Phản hồi thân thiện, tự nhiên

THÀNH VIÊN NHÓM HIỆN TẠI: ${chatMembers.join(', ')}
USER ĐANG CHAT: ${username || userId}

HƯỚNG DẪN PHÂN TÍCH:

FOOD_SUGGESTION - Khi user:
- Hỏi "ăn gì", "món gì ngon", "đói bụng"
- Yêu cầu gợi ý món ăn
- Nói về đồ ăn, nấu nướng
→ Gợi ý món phù hợp sinh viên tự nấu, nguyên liệu đơn giản, dễ kiếm

DEBT_TRACKING - Khi user:
- "A nợ B 50k", "tôi nợ X 100 nghìn" 
- "A trả nợ B", "đã trả tiền cho C"
- "ai nợ ai", "kiểm tra nợ"
- Đề cập đến tiền bạc, vay mượn, nợ nần
→ Phân tích WHO owes WHO how much, action type

CONVERSATION - Các trường hợp khác:
- Chào hỏi, trò chuyện bình thường
- Hỏi thông tin, câu hỏi chung
- Không liên quan food hay debt
→ Trả lời thân thiện, tự nhiên như con người

QUAN TRỌNG:
- LUÔN trả về JSON hợp lệ
- Phản hồi tự nhiên như con người nhắn tin, KHÔNG dùng emoji
- Với food: Ưu tiên món dễ nấu cho sinh viên, nguyên liệu rẻ, dễ kiếm
- Với debt: Nhận dạng chính xác username từ danh sách thành viên
- Số tiền format: chỉ số, không chữ (50000 thay vì "50k")
- Response phải ngắn gọn, thân thiện, không formal`;
  }
}