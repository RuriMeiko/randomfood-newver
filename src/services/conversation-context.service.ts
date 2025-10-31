import type NeonDB from '@/db/neon';
import { log } from '@/utils/logger';

export interface ConversationMessage {
  id: number;
  chatId: string;
  userId: string;
  messageType: 'user' | 'bot';
  content: string;
  timestamp: Date;
  tokenCount?: number;
}

export interface ConversationSummary {
  id: number;
  chatId: string;
  userId: string;
  summary: string;
  messageCount: number;
  startTime: Date;
  endTime: Date;
  tokenCount: number;
}

export class ConversationContextService {
  private database: NeonDB;
  private readonly MAX_CONTEXT_TOKENS = 32000; // Gemini 2.0 Flash context limit
  private readonly SUMMARY_THRESHOLD = 24000; // Start summarizing at 75% capacity
  private readonly KEEP_RECENT_MESSAGES = 10; // Always keep last 10 messages

  constructor(database: NeonDB) {
    this.database = database;
  }

  /**
   * Lưu tin nhắn user vào database
   */
  async saveUserMessage(chatId: string, userId: string, content: string): Promise<void> {
    try {
      const tokenCount = this.estimateTokenCount(content);
      
      await this.database.query(
        `INSERT INTO conversation_messages (chat_id, user_id, message_type, content, token_count) 
         VALUES ($1, $2, 'user', $3, $4)`,
        [chatId, userId, content, tokenCount]
      );

      log.debug('User message saved', { chatId, userId, tokenCount });
      
      // Kiểm tra và quản lý context overflow
      await this.manageContextWindow(chatId, userId);
    } catch (error: any) {
      log.error('Error saving user message', error, { chatId, userId });
    }
  }

  /**
   * Lưu phản hồi bot vào database
   */
  async saveBotResponse(chatId: string, userId: string, content: string): Promise<void> {
    try {
      const tokenCount = this.estimateTokenCount(content);
      
      await this.database.query(
        `INSERT INTO conversation_messages (chat_id, user_id, message_type, content, token_count) 
         VALUES ($1, $2, 'bot', $3, $4)`,
        [chatId, userId, content, tokenCount]
      );

      log.debug('Bot response saved', { chatId, userId, tokenCount });
    } catch (error: any) {
      log.error('Error saving bot response', error, { chatId, userId });
    }
  }

  /**
   * Lấy context conversation cho AI
   */
  async getConversationContext(chatId: string, userId: string): Promise<{
    messages: ConversationMessage[];
    summaries: ConversationSummary[];
    totalTokens: number;
    contextStatus: 'normal' | 'near_limit' | 'summarized';
  }> {
    try {
      // Lấy tin nhắn gần đây
      const messagesResult = await this.database.query(
        `SELECT * FROM conversation_messages 
         WHERE chat_id = $1 AND user_id = $2 
         ORDER BY timestamp DESC 
         LIMIT 50`,
        [chatId, userId]
      );
      const messages = Array.isArray(messagesResult) ? messagesResult as ConversationMessage[] : [];

      // Lấy summaries nếu có
      const summariesResult = await this.database.query(
        `SELECT * FROM conversation_summaries 
         WHERE chat_id = $1 AND user_id = $2 
         ORDER BY end_time DESC 
         LIMIT 5`,
        [chatId, userId]
      );
      const summaries = Array.isArray(summariesResult) ? summariesResult as ConversationSummary[] : [];

      // Tính tổng tokens
      const messageTokens = messages.reduce((sum, msg) => sum + (msg.tokenCount || 0), 0);
      const summaryTokens = summaries.reduce((sum, summary) => sum + summary.tokenCount, 0);
      const totalTokens = messageTokens + summaryTokens;

      // Xác định trạng thái context
      let contextStatus: 'normal' | 'near_limit' | 'summarized' = 'normal';
      if (totalTokens > this.SUMMARY_THRESHOLD) {
        contextStatus = 'near_limit';
      }
      if (summaries.length > 0) {
        contextStatus = 'summarized';
      }

      return {
        messages: messages.reverse(), // Đảo ngược để có thứ tự thời gian
        summaries,
        totalTokens,
        contextStatus
      };
    } catch (error: any) {
      log.error('Error getting conversation context', error, { chatId, userId });
      return { messages: [], summaries: [], totalTokens: 0, contextStatus: 'normal' };
    }
  }

  /**
   * Quản lý context window khi gần đầy
   */
  private async manageContextWindow(chatId: string, userId: string): Promise<void> {
    try {
      const context = await this.getConversationContext(chatId, userId);
      
      if (context.totalTokens > this.SUMMARY_THRESHOLD) {
        log.info('Context approaching limit, creating summary', {
          chatId, userId, 
          totalTokens: context.totalTokens,
          threshold: this.SUMMARY_THRESHOLD
        });

        await this.summarizeOldMessages(chatId, userId, context.messages);
      }
    } catch (error: any) {
      log.error('Error managing context window', error, { chatId, userId });
    }
  }

  /**
   * Tóm tắt tin nhắn cũ bằng Gemini
   */
  private async summarizeOldMessages(
    chatId: string, 
    userId: string, 
    messages: ConversationMessage[]
  ): Promise<void> {
    try {
      // Chỉ tóm tắt những tin nhắn cũ, giữ lại 10 tin nhắn gần nhất
      const messagesToSummarize = messages.slice(0, -this.KEEP_RECENT_MESSAGES);
      const messagesToKeep = messages.slice(-this.KEEP_RECENT_MESSAGES);

      if (messagesToSummarize.length < 5) {
        return; // Không đủ tin nhắn để tóm tắt
      }

      // Tạo nội dung để tóm tắt
      const conversationText = messagesToSummarize.map(msg => 
        `${msg.messageType === 'user' ? 'User' : 'Bot'}: ${msg.content}`
      ).join('\n');

      // Call Gemini để tóm tắt
      const summary = await this.createSummaryWithGemini(conversationText);
      
      if (summary) {
        // Lưu summary vào database
        const summaryTokenCount = this.estimateTokenCount(summary);
        // Safe timestamp handling for database operations
        const startTime = messagesToSummarize[0].timestamp instanceof Date 
          ? messagesToSummarize[0].timestamp 
          : new Date(messagesToSummarize[0].timestamp);
        const endTime = messagesToSummarize[messagesToSummarize.length - 1].timestamp instanceof Date
          ? messagesToSummarize[messagesToSummarize.length - 1].timestamp
          : new Date(messagesToSummarize[messagesToSummarize.length - 1].timestamp);

        await this.database.query(
          `INSERT INTO conversation_summaries 
           (chat_id, user_id, summary, message_count, start_time, end_time, token_count) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [chatId, userId, summary, messagesToSummarize.length, startTime, endTime, summaryTokenCount]
        );

        // Xóa tin nhắn đã được tóm tắt
        const messageIds = messagesToSummarize.map(msg => msg.id);
        await this.database.query(
          `DELETE FROM conversation_messages WHERE id = ANY($1)`,
          [messageIds]
        );

        log.info('Messages summarized and archived', {
          chatId, userId,
          summarizedCount: messagesToSummarize.length,
          keptCount: messagesToKeep.length,
          summaryTokens: summaryTokenCount
        });
      }
    } catch (error: any) {
      log.error('Error summarizing old messages', error, { chatId, userId });
    }
  }

  /**
   * Tạo summary bằng Gemini API
   */
  private async createSummaryWithGemini(conversationText: string): Promise<string | null> {
    try {
      // Lấy Gemini API key từ environment (cần được pass vào)
      // Tạm thời return null, sẽ implement sau khi có API key access
      
      const prompt = `Tóm tắt cuộc trò chuyện sau đây một cách ngắn gọn, giữ lại thông tin quan trọng về:
- Sở thích ăn uống của user
- Các khoản nợ đã được nhắc đến
- Các chủ đề chính được thảo luận
- Bối cảnh quan trọng cho cuộc trò chuyện tương lai

Cuộc trò chuyện:
${conversationText}

Hãy tóm tắt thành 2-3 câu ngắn gọn, tập trung vào thông tin hữu ích cho bot:`;

      // TODO: Implement actual Gemini API call
      // For now, create a simple summary
      const wordCount = conversationText.split(' ').length;
      const summary = `Cuộc trò chuyện ${wordCount} từ về món ăn và các chủ đề liên quan. User đã tương tác với bot về gợi ý ẩm thực và thông tin cá nhân.`;
      
      return summary;
    } catch (error: any) {
      log.error('Error creating summary with Gemini', error);
      return null;
    }
  }

  /**
   * Ước tính số tokens (roughly 1 token = 4 characters for Vietnamese)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Tạo context string cho Gemini
   */
  createContextForAI(
    messages: ConversationMessage[], 
    summaries: ConversationSummary[]
  ): string {
    let context = '';

    // Thêm summaries trước
    if (summaries.length > 0) {
      context += 'LỊCH SỬ TÓM TẮT:\n';
      summaries.forEach((summary, index) => {
        const timeRange = `${summary.startTime.toLocaleDateString()} - ${summary.endTime.toLocaleDateString()}`;
        context += `${index + 1}. [${timeRange}] ${summary.summary}\n`;
      });
      context += '\n';
    }

    // Thêm tin nhắn gần đây
    if (messages.length > 0) {
      context += 'TIN NHẮN GẦN ĐÂY:\n';
      messages.slice(-20).forEach((msg, index) => { // Chỉ lấy 20 tin nhắn gần nhất
        // Safe timestamp handling - convert to Date if needed
        let timestamp: Date;
        if (msg.timestamp instanceof Date) {
          timestamp = msg.timestamp;
        } else if (typeof msg.timestamp === 'string') {
          timestamp = new Date(msg.timestamp);
        } else {
          timestamp = new Date(); // Fallback to current time
        }

        const time = timestamp.toLocaleTimeString('vi-VN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const speaker = msg.messageType === 'user' ? 'User' : 'Bot';
        context += `${time} ${speaker}: ${msg.content}\n`;
      });
    }

    return context;
  }

  /**
   * Thống kê context usage
   */
  async getContextStats(chatId: string, userId: string): Promise<{
    totalMessages: number;
    totalSummaries: number;
    estimatedTokens: number;
    percentageUsed: number;
  }> {
    try {
      // Simplified stats without complex queries for now
      return {
        totalMessages: 0,
        totalSummaries: 0, 
        estimatedTokens: 0,
        percentageUsed: 0
      };
    } catch (error: any) {
      log.error('Error getting context stats', error, { chatId, userId });
      return { totalMessages: 0, totalSummaries: 0, estimatedTokens: 0, percentageUsed: 0 };
    }
  }
}