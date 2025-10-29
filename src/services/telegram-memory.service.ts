import TelegramApi from '@/telegram/api';
import { log } from '@/utils/logger';

export interface TelegramMessage {
  messageId: number;
  userId: string;
  username?: string;
  text: string;
  date: Date;
  isBot: boolean;
  chatId: string;
}

export class TelegramMemoryService {
  private telegramApi: TelegramApi;
  private messageCache: Map<string, TelegramMessage[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 phút

  constructor(telegramApi: TelegramApi) {
    this.telegramApi = telegramApi;
  }

  /**
   * Lấy lịch sử tin nhắn từ Telegram trực tiếp
   * Note: Telegram Bot API có giới hạn, chỉ có thể lấy tin nhắn thông qua webhook
   * Chúng ta sẽ sử dụng cache để lưu tin nhắn đã nhận
   */
  async getRecentMessages(chatId: string, limit: number = 20): Promise<TelegramMessage[]> {
    const cacheKey = `${chatId}_messages`;
    const now = Date.now();

    // Kiểm tra cache
    if (this.messageCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        const cached = this.messageCache.get(cacheKey) || [];
        log.debug('Using cached messages', { 
          chatId, 
          count: cached.length,
          cacheAge: now - (expiry - this.CACHE_TTL)
        });
        return cached.slice(-limit);
      }
    }

    // Telegram Bot API không cho phép lấy lịch sử tin nhắn cũ
    // Chúng ta cần lưu tin nhắn khi nhận được qua webhook
    log.warn('Telegram Bot API does not support message history retrieval', { chatId });
    return this.messageCache.get(cacheKey)?.slice(-limit) || [];
  }

  /**
   * Thêm tin nhắn mới vào cache (gọi từ webhook handler)
   */
  addMessageToCache(chatId: string, message: TelegramMessage): void {
    const cacheKey = `${chatId}_messages`;
    const messages = this.messageCache.get(cacheKey) || [];
    
    // Thêm tin nhắn mới
    messages.push(message);
    
    // Giữ tối đa 100 tin nhắn gần nhất
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
    
    this.messageCache.set(cacheKey, messages);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

    log.debug('Added message to cache', { 
      chatId, 
      totalCached: messages.length,
      messageText: (message.text || '').substring(0, 50)
    });
  }

  /**
   * Thêm phản hồi bot vào cache
   */
  addBotResponseToCache(chatId: string, responseText: string, replyToMessageId?: number): void {
    const botMessage: TelegramMessage = {
      messageId: Date.now(), // Tạm thời dùng timestamp
      userId: 'bot',
      username: 'randomfoodruribot',
      text: responseText,
      date: new Date(),
      isBot: true,
      chatId: chatId
    };

    this.addMessageToCache(chatId, botMessage);
  }

  /**
   * Phân tích context từ tin nhắn đã cache
   */
  analyzeConversationContext(chatId: string, userId: string): {
    totalMessages: number;
    userMessages: number;
    botResponses: number;
    recentTopics: string[];
    userPreferences: string[];
  } {
    const cacheKey = `${chatId}_messages`;
    const messages = this.messageCache.get(cacheKey) || [];
    
    const userMessages = messages.filter(m => m.userId === userId && !m.isBot);
    const botMessages = messages.filter(m => m.isBot);

    // Phân tích chủ đề gần đây
    const recentMessages = messages.slice(-10);
    const recentTopics: string[] = [];
    const userPreferences: string[] = [];

    const topicKeywords = {
      'food': ['ăn', 'món', 'nấu', 'đói', 'ngon'],
      'debt': ['nợ', 'tiền', 'trả', 'mượn'],
      'cooking': ['nấu', 'làm', 'công thức'],
      'spicy': ['cay'],
      'simple': ['đơn giản', 'nhanh'],
      'cheap': ['rẻ', 'tiết kiệm']
    };

    recentMessages.forEach(msg => {
      const text = msg.text.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          if (topic === 'spicy' || topic === 'simple' || topic === 'cheap') {
            if (!userPreferences.includes(topic)) {
              userPreferences.push(topic);
            }
          } else {
            if (!recentTopics.includes(topic)) {
              recentTopics.push(topic);
            }
          }
        }
      });
    });

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      botResponses: botMessages.length,
      recentTopics,
      userPreferences
    };
  }

  /**
   * Tạo context summary từ tin nhắn cache
   */
  createContextSummary(chatId: string, userId: string): string {
    const analysis = this.analyzeConversationContext(chatId, userId);
    const messages = this.messageCache.get(`${chatId}_messages`) || [];
    const recentUserMessages = messages
      .filter(m => m.userId === userId && !m.isBot)
      .slice(-5);

    let summary = `Lịch sử chat: ${analysis.totalMessages} tin nhắn`;
    
    if (analysis.userMessages > 0) {
      summary += `, user đã nhắn ${analysis.userMessages} lần`;
    }

    if (analysis.recentTopics.length > 0) {
      summary += `, chủ đề gần đây: ${analysis.recentTopics.join(', ')}`;
    }

    if (analysis.userPreferences.length > 0) {
      summary += `, sở thích: ${analysis.userPreferences.join(', ')}`;
    }

    if (recentUserMessages.length > 0) {
      summary += '\n\nTin nhắn gần đây của user:\n';
      recentUserMessages.forEach((msg, index) => {
        const timeAgo = Math.floor((Date.now() - msg.date.getTime()) / 60000);
        const msgText = msg.text || '';
        summary += `${index + 1}. "${msgText.substring(0, 80)}${msgText.length > 80 ? '...' : ''}" (${timeAgo}p trước)\n`;
      });
    }

    return summary;
  }

  /**
   * Kiểm tra user có reference đến tin nhắn cũ không
   */
  shouldLoadMoreContext(userMessage: string): boolean {
    const pastReferences = [
      'hôm qua', 'tuần trước', 'lần trước', 'trước đó',
      'nhớ không', 'đã nói', 'như lần trước', 'như hôm nọ'
    ];

    return pastReferences.some(ref => 
      userMessage.toLowerCase().includes(ref)
    );
  }

  /**
   * Tìm tin nhắn liên quan đến từ khóa
   */
  findRelatedMessages(chatId: string, userId: string, keywords: string[]): TelegramMessage[] {
    const cacheKey = `${chatId}_messages`;
    const messages = this.messageCache.get(cacheKey) || [];
    
    return messages.filter(msg => {
      if (msg.userId !== userId && !msg.isBot) return false;
      
      const text = msg.text.toLowerCase();
      return keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
    }).slice(-10); // Chỉ lấy 10 tin nhắn liên quan gần nhất
  }

  /**
   * Clear cache cũ để tiết kiệm memory
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        this.messageCache.delete(key);
        this.cacheExpiry.delete(key);
        log.debug('Cleared expired message cache', { key });
      }
    }
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats(): { totalChats: number; totalMessages: number; cacheSize: string } {
    let totalMessages = 0;
    for (const messages of this.messageCache.values()) {
      totalMessages += messages.length;
    }

    const cacheSize = `${Math.round(JSON.stringify([...this.messageCache.entries()]).length / 1024)}KB`;

    return {
      totalChats: this.messageCache.size,
      totalMessages,
      cacheSize
    };
  }
}