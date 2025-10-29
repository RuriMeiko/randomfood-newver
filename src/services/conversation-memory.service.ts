import type NeonDB from '@/db/neon';
import { log } from '@/utils/logger';

export interface ConversationMessage {
  id: number;
  chatId: string;
  userId: string;
  userMessage: string;
  aiResponse: string;
  actionType: string;
  createdAt: Date;
}

export class ConversationMemoryService {
  private database: NeonDB;

  constructor(database: NeonDB) {
    this.database = database;
  }

  /**
   * Lấy lịch sử cuộc trò chuyện gần đây
   */
  async getRecentConversation(
    chatId: string, 
    userId: string, 
    limit: number = 20
  ): Promise<ConversationMessage[]> {
    try {
      const messages = await this.database.query(
        `SELECT * FROM ai_conversations 
         WHERE chat_id = $1 AND user_id = $2 
         ORDER BY created_at DESC 
         LIMIT $3`,
        [chatId, userId, limit]
      ) as ConversationMessage[];

      // Đảo ngược để có thứ tự từ cũ đến mới
      return messages.reverse();
    } catch (error: any) {
      log.error('Error getting recent conversation', error, { chatId, userId });
      return [];
    }
  }

  /**
   * Lấy lịch sử cuộc trò chuyện cả nhóm (để hiểu context chung)
   */
  async getGroupConversation(
    chatId: string, 
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    try {
      const messages = await this.database.query(
        `SELECT * FROM ai_conversations 
         WHERE chat_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [chatId, limit]
      ) as ConversationMessage[];

      return messages.reverse();
    } catch (error: any) {
      log.error('Error getting group conversation', error, { chatId });
      return [];
    }
  }

  /**
   * Tìm cuộc trò chuyện liên quan đến chủ đề cụ thể
   */
  async findRelatedConversations(
    chatId: string,
    userId: string,
    keywords: string[],
    limit: number = 5
  ): Promise<ConversationMessage[]> {
    try {
      // Tạo điều kiện tìm kiếm cho các keywords
      const keywordConditions = keywords.map((_, index) => 
        `(user_message ILIKE $${index + 3} OR ai_response ILIKE $${index + 3})`
      ).join(' OR ');

      const keywordParams = keywords.map(keyword => `%${keyword}%`);

      const query = `
        SELECT * FROM ai_conversations 
        WHERE chat_id = $1 AND user_id = $2 
        AND (${keywordConditions})
        ORDER BY created_at DESC 
        LIMIT $${keywords.length + 3}
      `;

      const params = [chatId, userId, ...keywordParams, limit];

      const messages = await this.database.query(query, params) as ConversationMessage[];
      return messages.reverse();
    } catch (error: any) {
      log.error('Error finding related conversations', error, { chatId, userId, keywords });
      return [];
    }
  }

  /**
   * Phân tích và tóm tắt cuộc trò chuyện dài
   */
  analyzeConversationPatterns(messages: ConversationMessage[]): {
    totalMessages: number;
    foodQuestions: number;
    debtMentions: number;
    commonTopics: string[];
    userPreferences: string[];
  } {
    const analysis = {
      totalMessages: messages.length,
      foodQuestions: 0,
      debtMentions: 0,
      commonTopics: [] as string[],
      userPreferences: [] as string[]
    };

    const topicKeywords = {
      food: ['ăn', 'món', 'nấu', 'đói', 'ngon', 'mì', 'cơm', 'phở'],
      debt: ['nợ', 'tiền', 'trả', 'mượn', 'vay'],
      cooking: ['nấu', 'làm', 'nguyên liệu', 'công thức'],
      money: ['nghìn', 'k', 'đồng', 'VND', 'tiền']
    };

    messages.forEach(msg => {
      const userText = msg.userMessage.toLowerCase();
      const aiText = msg.aiResponse.toLowerCase();
      
      if (msg.actionType === 'food_suggestion') {
        analysis.foodQuestions++;
      }
      
      if (msg.actionType === 'debt_tracking') {
        analysis.debtMentions++;
      }

      // Phân tích chủ đề
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => userText.includes(keyword))) {
          if (!analysis.commonTopics.includes(topic)) {
            analysis.commonTopics.push(topic);
          }
        }
      });

      // Phân tích sở thích ăn uống
      const foodPreferences = ['cay', 'ngọt', 'chay', 'mặn', 'nhanh', 'đơn giản'];
      foodPreferences.forEach(pref => {
        if (userText.includes(pref) && !analysis.userPreferences.includes(pref)) {
          analysis.userPreferences.push(pref);
        }
      });
    });

    return analysis;
  }

  /**
   * Tạo context summary từ lịch sử hội thoại
   */
  createContextSummary(messages: ConversationMessage[]): string {
    if (messages.length === 0) {
      return "Cuộc trò chuyện mới, chưa có lịch sử.";
    }

    const analysis = this.analyzeConversationPatterns(messages);
    const recentMessages = messages.slice(-3); // 3 tin nhắn gần nhất

    let summary = `Lịch sử: ${analysis.totalMessages} tin nhắn`;
    
    if (analysis.foodQuestions > 0) {
      summary += `, đã hỏi về món ăn ${analysis.foodQuestions} lần`;
    }
    
    if (analysis.debtMentions > 0) {
      summary += `, có ${analysis.debtMentions} lần nhắc về nợ`;
    }

    if (analysis.userPreferences.length > 0) {
      summary += `, thích: ${analysis.userPreferences.join(', ')}`;
    }

    summary += '\n\nTin nhắn gần đây:\n';
    recentMessages.forEach((msg, index) => {
      summary += `${index + 1}. User: "${msg.userMessage.substring(0, 50)}${msg.userMessage.length > 50 ? '...' : ''}"\n`;
      summary += `   Bot: "${msg.aiResponse.substring(0, 50)}${msg.aiResponse.length > 50 ? '...' : ''}"\n`;
    });

    return summary;
  }

  /**
   * Kiểm tra xem có cần load thêm context cũ không
   */
  shouldLoadMoreContext(
    currentMessages: ConversationMessage[],
    userMessage: string
  ): boolean {
    // Load thêm nếu user hỏi về quá khứ
    const pastReferences = [
      'hôm qua', 'tuần trước', 'lần trước', 'trước đó', 
      'nhớ không', 'đã nói', 'như lần trước'
    ];

    return pastReferences.some(ref => 
      userMessage.toLowerCase().includes(ref)
    );
  }

  /**
   * Load thêm context cũ khi cần thiết
   */
  async loadExtendedContext(
    chatId: string,
    userId: string,
    currentLimit: number = 20
  ): Promise<ConversationMessage[]> {
    try {
      // Load thêm 50 tin nhắn cũ hơn
      const extendedMessages = await this.database.query(
        `SELECT * FROM ai_conversations 
         WHERE chat_id = $1 AND user_id = $2 
         ORDER BY created_at DESC 
         LIMIT $3 OFFSET $4`,
        [chatId, userId, 50, currentLimit]
      ) as ConversationMessage[];

      return extendedMessages.reverse();
    } catch (error: any) {
      log.error('Error loading extended context', error, { chatId, userId });
      return [];
    }
  }
}