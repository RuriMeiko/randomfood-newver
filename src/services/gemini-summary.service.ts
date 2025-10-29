import { log } from '@/utils/logger';

export class GeminiSummaryService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Tạo summary cho conversation cũ bằng Gemini
   */
  async createConversationSummary(conversationText: string): Promise<string | null> {
    try {
      const prompt = `Bạn là chuyên gia tóm tắt cuộc trò chuyện. Hãy tóm tắt cuộc trò chuyện sau đây một cách ngắn gọn nhưng đầy đủ thông tin quan trọng:

NHIỆM VỤ:
- Giữ lại tất cả thông tin về sở thích ẩm thực của user
- Ghi nhận các khoản nợ, tiền bạc đã được nhắc đến
- Lưu lại các chủ đề chính và ngữ cảnh quan trọng
- Ghi nhớ tính cách, phong cách giao tiếp của user
- Tóm tắt thành 3-4 câu ngắn gọn, súc tích

CUỘC TRÒ CHUYỆN:
${conversationText}

Hãy tóm tắt theo format:
"Sở thích: [thông tin về đồ ăn user thích]
Nợ/Tiền: [thông tin về tiền bạc nếu có]  
Chủ đề: [các chủ đề chính đã thảo luận]
Tính cách: [phong cách giao tiếp của user]"

Chỉ trả về phần tóm tắt, không giải thích thêm:`;

      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3, // Low temperature for consistent summaries
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 300, // Keep summaries concise
        }
      };

      log.debug('Creating conversation summary with Gemini', {
        inputLength: conversationText.length,
        estimatedTokens: Math.ceil(conversationText.length / 4)
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
        log.error('Gemini summary API error', undefined, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          processingTime
        });
        return null;
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        log.error('No summary candidates from Gemini', undefined, { 
          response: data, 
          processingTime 
        });
        return null;
      }

      const summary = data.candidates[0]?.content?.parts[0]?.text || '';
      
      if (!summary.trim()) {
        log.error('Empty summary from Gemini', undefined, { 
          data, 
          processingTime 
        });
        return null;
      }

      log.info('Conversation summary created successfully', {
        originalLength: conversationText.length,
        summaryLength: summary.length,
        compressionRatio: Math.round((summary.length / conversationText.length) * 100),
        processingTime
      });

      return summary.trim();

    } catch (error: any) {
      log.error('Error creating conversation summary', error, {
        errorMessage: error.message,
        errorStack: error.stack,
        inputLength: conversationText.length
      });
      
      return null;
    }
  }

  /**
   * Tạo summary nhanh cho context window management
   */
  async createQuickSummary(messages: string[], maxTokens: number = 200): Promise<string | null> {
    try {
      const conversationText = messages.join('\n');
      
      // Nếu quá ngắn thì không cần tóm tắt
      if (conversationText.length < 500) {
        return conversationText;
      }

      const prompt = `Tóm tắt cuộc trò chuyện này thành 2-3 câu ngắn gọn, giữ lại thông tin quan trọng nhất:

${conversationText}

Tóm tắt:`;

      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: maxTokens,
        }
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        log.error('Quick summary API error', undefined, {
          status: response.status,
          statusText: response.statusText
        });
        return null;
      }

      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return summary?.trim() || null;

    } catch (error: any) {
      log.error('Error creating quick summary', error);
      return null;
    }
  }

  /**
   * Kiểm tra xem text có cần tóm tắt không
   */
  shouldSummarize(text: string, tokenLimit: number = 1000): boolean {
    const estimatedTokens = Math.ceil(text.length / 4); // Rough estimate
    return estimatedTokens > tokenLimit;
  }

  /**
   * Chia text thành chunks để tóm tắt từng phần
   */
  splitIntoChunks(text: string, maxChunkSize: number = 8000): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Tóm tắt conversation dài thành nhiều phần
   */
  async summarizeLongConversation(conversationText: string): Promise<string | null> {
    try {
      // Nếu ngắn thì tóm tắt trực tiếp
      if (conversationText.length < 8000) {
        return this.createConversationSummary(conversationText);
      }

      // Chia thành chunks và tóm tắt từng phần
      const chunks = this.splitIntoChunks(conversationText, 6000);
      const summaries: string[] = [];

      for (const chunk of chunks) {
        const summary = await this.createQuickSummary([chunk], 150);
        if (summary) {
          summaries.push(summary);
        }
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Tóm tắt các summaries thành final summary
      if (summaries.length > 1) {
        const combinedSummaries = summaries.join('\n');
        return this.createConversationSummary(combinedSummaries);
      }

      return summaries[0] || null;

    } catch (error: any) {
      log.error('Error summarizing long conversation', error);
      return null;
    }
  }
}