import { log } from '@/utils/logger';
import { buildSystemPrompt } from '@/prompts/system-prompt';
import { ConversationMemoryService } from './conversation-memory.service';

export interface GeminiAIResponse {
  actionType: 'food_suggestion' | 'debt_tracking' | 'conversation' | 'error';
  response: string;
  data?: {
    // For food suggestions
    foodName?: string;
    description?: string;
    questions?: string[];
    
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
  private memoryService: ConversationMemoryService;

  constructor(apiKey: string, memoryService: ConversationMemoryService) {
    this.apiKey = apiKey;
    this.memoryService = memoryService;
  }

  /**
   * Process user message with Gemini AI to determine action and response
   */
  async processMessage(
    userMessage: string, 
    chatMembers: string[], 
    userId: string,
    chatId: string,
    username?: string
  ): Promise<GeminiAIResponse> {
    try {
      // Lấy lịch sử cuộc trò chuyện
      const conversationHistory = await this.memoryService.getRecentConversation(chatId, userId, 20);
      
      // Kiểm tra xem có cần load thêm context cũ không
      const needMoreContext = this.memoryService.shouldLoadMoreContext(conversationHistory, userMessage);
      let extendedHistory: any[] = [];
      
      if (needMoreContext) {
        extendedHistory = await this.memoryService.loadExtendedContext(chatId, userId, 20);
        log.debug('Loading extended context', { 
          userId, 
          extendedCount: extendedHistory.length,
          reason: 'User referenced past conversation'
        });
      }

      // Tạo context summary
      const allHistory = [...extendedHistory, ...conversationHistory];
      const contextSummary = this.memoryService.createContextSummary(allHistory);

      // Build system prompt với conversation context
      const systemPrompt = buildSystemPrompt(chatMembers, userId, username, allHistory);
      
      const requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}

CONTEXT CUỘC TRỎ CHUYỆN:
${contextSummary}

USER MESSAGE MỚI: "${userMessage}"

Dựa trên context và tin nhắn mới, phân tích và trả về JSON:
{
  "actionType": "food_suggestion" | "debt_tracking" | "conversation",
  "response": "Câu trả lời tự nhiên như con người nhắn tin, KHÔNG emoji",
  "data": {
    // Nếu là food_suggestion:
    "foodName": "Tên món ăn",
    "description": "Cách làm đơn giản cho sinh viên",
    "ingredients": ["Nguyên liệu dễ kiếm, rẻ"]
    
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
        historyCount: conversationHistory.length,
        hasExtendedContext: extendedHistory.length > 0
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
        
        log.info('Gemini AI response processed successfully', { 
          actionType: aiResponse.actionType,
          responseLength: aiResponse.response?.length || 0,
          processingTime,
          userId,
          chatId,
          contextUsed: allHistory.length > 0
        });

        return {
          ...aiResponse,
          success: true
        };

      } catch (parseError: any) {
        log.error('Error parsing AI JSON response', parseError, { 
          aiResponseText,
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