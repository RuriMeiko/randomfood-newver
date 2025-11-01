import { log } from '@/utils/logger';
import { buildSimpleConversationPrompt } from '@/prompts/simple-conversation-prompt';

export interface SimpleAIResponse {
  actionType: 'conversation';
  response: string;
  data: {
    conversationResponse: string;
  };
  success: boolean;
  error?: string;
}

export class SimpleAIService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor(geminiApiKey: string) {
    this.apiKey = geminiApiKey;
  }

  /**
   * Process user message with simple conversation AI
   */
  async processMessage(
    userMessage: string,
    userId: string,
    username?: string
  ): Promise<SimpleAIResponse> {
    try {
      // Build simple conversation prompt
      const systemPrompt = buildSimpleConversationPrompt(userId, username);

      const requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}

USER MESSAGE: "${userMessage}"

Phân tích message và trả về JSON response để trò chuyện tự nhiên.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2000,
        }
      };

      log.info('🤖 Simple AI processing message', {
        userId,
        userMessage: userMessage.substring(0, 50),
        username
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
          actionType: 'conversation',
          response: Math.random() > 0.5 ? 'Ơi lỗi rồi, thử lại đi a' : 'Có vấn đề gì đó, retry xem',
          data: { conversationResponse: 'Error response' },
          success: false,
          error: `API Error: ${response.status}`
        };
      }

      const data: any = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        log.error('❌ No candidates in Gemini response', undefined, {
          userId, processingTime
        });
        return {
          actionType: 'conversation',
          response: Math.random() > 0.5 ? 'AI không rep gì hết á' : 'Lỗi AI rồi, thử lại nha',
          data: { conversationResponse: 'No response' },
          success: false,
          error: 'No AI response generated'
        };
      }

      const aiResponseText = data.candidates[0]?.content?.parts[0]?.text || '';

      if (!aiResponseText.trim()) {
        log.error('❌ Empty response from Gemini', undefined, {
          userId, processingTime
        });
        return {
          actionType: 'conversation',
          response: Math.random() > 0.5 ? 'AI rep trống không à' : 'Response rỗng, lỗi rồi',
          data: { conversationResponse: 'Empty response' },
          success: false,
          error: 'Empty AI response'
        };
      }

      // Parse JSON response from AI
      try {
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          log.warn('No JSON found in AI response, using raw text', {
            userId,
            aiResponseText: aiResponseText.substring(0, 100)
          });
          return {
            actionType: 'conversation',
            response: aiResponseText,
            data: { conversationResponse: aiResponseText },
            success: true
          };
        }

        const aiResponse = JSON.parse(jsonMatch[0]);

        // Validate response
        if (!aiResponse.response) {
          log.warn('No response field in AI JSON, using raw text', {
            userId,
            aiResponse
          });
          return {
            actionType: 'conversation',
            response: aiResponseText,
            data: { conversationResponse: aiResponseText },
            success: true
          };
        }

        log.info('✅ Simple AI response processed', {
          userId,
          processingTime,
          responseLength: aiResponse.response.length
        });

        return {
          actionType: 'conversation',
          response: aiResponse.response,
          data: aiResponse.data || { conversationResponse: aiResponse.response },
          success: true
        };

      } catch (parseError: any) {
        log.warn('Error parsing AI JSON, using raw text', parseError, {
          userId,
          aiResponseText: aiResponseText.substring(0, 100)
        });

        // Fallback to raw text
        return {
          actionType: 'conversation',
          response: aiResponseText,
          data: { conversationResponse: aiResponseText },
          success: true
        };
      }

    } catch (error: any) {
      log.error('❌ Error in Simple AI Service', error, {
        userId,
        userMessage: userMessage.substring(0, 50)
      });

      return {
        actionType: 'conversation',
        response: Math.random() > 0.5 ? 'Connect AI lỗi rồi, thử lại đi' : 'Mạng có vấn đề, retry nha',
        data: { conversationResponse: 'Error response' },
        success: false,
        error: error.message
      };
    }
  }
}