// Simple AI chat service với lưu lịch sử
import NeonDB from './db/neon';
import { chatHistory, botPersonality } from './db/schema';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIService {
  private db: NeonDB;
  
  constructor(connectionString: string) {
    this.db = new NeonDB({ connectionString });
  }

  // Lấy hoặc tạo system prompt cho chat
  async getSystemPrompt(chatId: string): Promise<string> {
    const { document } = await this.db
      .collection('bot_personality')
      .findOne({ filter: { chatId } });
    
    if (document) {
      return document.systemPrompt;
    }
    
    // Tạo system prompt mặc định
    const defaultPrompt = `Bạn là một AI assistant thân thiện và hữu ích. 
Bạn có tính cách vui vẻ, thích trò chuyện và luôn sẵn sàng giúp đỡ.
Hãy trả lời một cách tự nhiên như con người, có thể sử dụng emoji và ngôn ngữ thân thiện.
Bạn có thể nhớ cuộc trò chuyện trước đó và tham khảo chúng khi cần thiết.`;
    
    await this.db.collection('bot_personality').insertOne({
      chatId,
      systemPrompt: defaultPrompt,
      personalityTraits: 'Thân thiện, vui vẻ, hữu ích',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return defaultPrompt;
  }

  // Lấy lịch sử chat gần đây
  async getChatHistory(chatId: string, limit: number = 10): Promise<ChatMessage[]> {
    const { documents } = await this.db
      .collection('chat_history')
      .find({ 
        filter: { chatId },
        sort: { createdAt: -1 },
        limit
      });
    
    return documents.reverse().map(msg => ({
      role: msg.messageType === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }

  // Lưu tin nhắn vào lịch sử
  async saveMessage(chatId: string, userId: string, username: string, messageType: 'user' | 'ai', content: string) {
    await this.db.collection('chat_history').insertOne({
      chatId,
      userId,
      username,
      messageType,
      content,
      createdAt: new Date()
    });
  }

  // Chat với AI (sử dụng API của bạn chọn)
  async chat(chatId: string, userId: string, username: string, userMessage: string): Promise<string> {
    // Lưu tin nhắn user
    await this.saveMessage(chatId, userId, username, 'user', userMessage);
    
    // Lấy system prompt và lịch sử
    const systemPrompt = await this.getSystemPrompt(chatId);
    const history = await this.getChatHistory(chatId, 10);
    
    // Tạo messages cho AI
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];
    
    // TODO: Gọi AI API (Google Gemini, OpenAI, etc.)
    // Hiện tại return response giả
    const aiResponse = `Tôi đã nhận được tin nhắn: "${userMessage}". Đây là response từ AI!`;
    
    // Lưu response của AI
    await this.saveMessage(chatId, 'ai', 'AI Assistant', 'ai', aiResponse);
    
    return aiResponse;
  }

  // Cập nhật system prompt
  async updateSystemPrompt(chatId: string, newPrompt: string, traits?: string) {
    const { document } = await this.db
      .collection('bot_personality')
      .findOne({ filter: { chatId } });
    
    if (document) {
      await this.db.collection('bot_personality').updateOne(
        { filter: { chatId } },
        { update: { 
          systemPrompt: newPrompt,
          personalityTraits: traits || document.personalityTraits,
          updatedAt: new Date()
        }}
      );
    } else {
      await this.db.collection('bot_personality').insertOne({
        chatId,
        systemPrompt: newPrompt,
        personalityTraits: traits || 'Custom personality',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
}