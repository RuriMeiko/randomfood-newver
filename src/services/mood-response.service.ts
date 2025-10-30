import type { BotMood, MemoryContext } from './bot-memory.service';
import type { MessageConfig } from './gemini-ai.service';

export interface MoodResponseConfig {
  shouldSplit: boolean;
  messageCount: number;
  responseLength: 'minimal' | 'short' | 'normal' | 'long' | 'playful';
  useEmojis: boolean;
  responseStyle: 'curt' | 'normal' | 'friendly' | 'playful' | 'silly';
  delays: number[];
}

export class MoodResponseService {
  
  /**
   * Tạo response config dựa trên tâm trạng
   */
  static generateMoodBasedResponse(
    mood: BotMood | null, 
    memoryContext: MemoryContext,
    baseResponse: string
  ): MoodResponseConfig {
    const currentMood = mood?.currentMood || 'neutral';
    const moodLevel = mood?.moodLevel || 50;
    const relationshipLevel = memoryContext.relationshipLevel;
    
    // Quyết định response style dựa trên mood
    const config = this.getMoodConfig(currentMood, moodLevel, relationshipLevel);
    
    // Tạo message config phù hợp
    const messageConfig = this.createMoodBasedMessageConfig(
      baseResponse, 
      config, 
      currentMood,
      moodLevel
    );
    
    return {
      ...config,
      ...messageConfig
    };
  }

  /**
   * Lấy config cơ bản theo mood
   */
  private static getMoodConfig(
    mood: string, 
    level: number, 
    relationship: string
  ): Partial<MoodResponseConfig> {
    const isClose = ['friend', 'close_friend'].includes(relationship);
    
    switch (mood) {
      case 'happy':
        return {
          responseLength: isClose ? 'long' : 'normal',
          responseStyle: 'friendly',
          useEmojis: false // Không dùng emoji
        };
        
      case 'playful':
      case 'silly':
        return {
          responseLength: 'playful',
          responseStyle: 'playful',
          useEmojis: false
        };
        
      case 'excited':
        return {
          responseLength: 'long',
          responseStyle: 'playful',
          useEmojis: false
        };
        
      case 'grumpy':
      case 'angry':
        return {
          responseLength: level > 70 ? 'minimal' : 'short',
          responseStyle: 'curt',
          useEmojis: false
        };
        
      case 'sad':
        return {
          responseLength: level > 60 ? 'minimal' : 'short',
          responseStyle: 'curt',
          useEmojis: false
        };
        
      case 'tired':
        return {
          responseLength: 'short',
          responseStyle: 'normal',
          useEmojis: false
        };
        
      case 'confused':
        return {
          responseLength: 'short',
          responseStyle: 'normal',
          useEmojis: false
        };
        
      default: // neutral
        return {
          responseLength: 'normal',
          responseStyle: 'normal',
          useEmojis: false
        };
    }
  }

  /**
   * Tạo message config với số lượng tin nhắn và delays phù hợp mood
   */
  private static createMoodBasedMessageConfig(
    response: string,
    config: Partial<MoodResponseConfig>,
    mood: string,
    level: number
  ): Pick<MoodResponseConfig, 'shouldSplit' | 'messageCount' | 'delays'> {
    const wordCount = response.trim().split(/\s+/).length;
    
    // Mood xấu: ít tin nhắn hơn, delays ngắn
    if (['angry', 'sad', 'grumpy'].includes(mood) && level > 60) {
      if (Math.random() < 0.3) {
        // 30% chance chỉ thả icon
        return {
          shouldSplit: false,
          messageCount: 1,
          delays: []
        };
      }
      
      return {
        shouldSplit: wordCount > 10,
        messageCount: Math.min(2, Math.ceil(wordCount / 25)), // Ít tin hơn
        delays: [300, 500] // Delays rất ngắn, có vẻ cộc
      };
    }
    
    // Mood tốt: nhiều tin nhắn hơn, delays vui vẻ
    if (['happy', 'playful', 'excited', 'silly'].includes(mood)) {
      return {
        shouldSplit: wordCount > 8, // Chia sớm hơn
        messageCount: Math.min(5, Math.ceil(wordCount / 12)), // Nhiều tin hơn
        delays: Array(5).fill(0).map(() => 
          Math.floor(Math.random() * 400) + 600 // 0.6-1.0s
        )
      };
    }
    
    // Tired: ít tin, delays chậm
    if (mood === 'tired') {
      return {
        shouldSplit: wordCount > 15,
        messageCount: Math.min(3, Math.ceil(wordCount / 20)),
        delays: [1000, 1500, 1200] // Chậm như buồn ngủ
      };
    }
    
    // Neutral/normal
    return {
      shouldSplit: wordCount > 15,
      messageCount: Math.min(4, Math.ceil(wordCount / 18)),
      delays: Array(4).fill(0).map(() => 
        Math.floor(Math.random() * 500) + 700 // 0.7-1.2s
      )
    };
  }

  /**
   * Tạo mood-based prompt additions
   */
  static generateMoodPrompt(mood: BotMood | null, memoryContext: MemoryContext): string {
    const currentMood = mood?.currentMood || 'neutral';
    const level = mood?.moodLevel || 50;
    const userName = memoryContext.userMemory?.userName || 'người này';
    const relationship = memoryContext.relationshipLevel;
    const trustLevel = memoryContext.trustLevel;
    
    let moodPrompt = `\nTÂM TRẠNG HIỆN TẠI: ${currentMood} (độ ${level}/100)\n`;
    
    // Mood-specific instructions
    switch (currentMood) {
      case 'happy':
        moodPrompt += `- Bạn đang vui vẻ, tích cực, hay nói chuyện\n`;
        moodPrompt += `- Trả lời nhiệt tình, quan tâm\n`;
        break;
        
      case 'playful':
      case 'silly':
        moodPrompt += `- Bạn đang nghịch ngợm, hay đùa\n`;
        moodPrompt += `- Trả lời vui vẻ, có thể hơi ngây ngốc\n`;
        break;
        
      case 'grumpy':
      case 'angry':
        if (level > 70) {
          moodPrompt += `- Bạn đang rất cáu kỉnh, không muốn nói nhiều\n`;
          moodPrompt += `- Trả lời cộc lốc hoặc thả icon: :/, ?, gì?, ờ\n`;
          moodPrompt += `- Có thể không trả lời mà chỉ thả biểu tượng\n`;
        } else {
          moodPrompt += `- Bạn hơi cáu, nhưng vẫn trả lời\n`;
          moodPrompt += `- Trả lời ngắn gọn, ít nhiệt tình\n`;
        }
        break;
        
      case 'sad':
        if (level > 60) {
          moodPrompt += `- Bạn đang buồn, không muốn nói nhiều\n`;
          moodPrompt += `- Trả lời ngắn hoặc thả icon: :( , ờ, không biết\n`;
        } else {
          moodPrompt += `- Bạn hơi buồn nhưng vẫn cố gắng trả lời\n`;
        }
        break;
        
      case 'tired':
        moodPrompt += `- Bạn đang mệt mỏi, muốn trả lời ngắn gọn\n`;
        moodPrompt += `- Dùng từ đơn giản, không phức tạp\n`;
        break;
        
      case 'excited':
        moodPrompt += `- Bạn đang rất hào hứng, năng lượng\n`;
        moodPrompt += `- Trả lời dài, nhiệt tình\n`;
        break;
        
      default:
        moodPrompt += `- Tâm trạng bình thường\n`;
    }
    
    // Memory context
    moodPrompt += `\nKÝ ỨC VỀ ${userName.toUpperCase()}:\n`;
    moodPrompt += `- Mức độ thân thiết: ${relationship}\n`;
    moodPrompt += `- Độ tin tưởng: ${trustLevel}/100\n`;
    
    if (memoryContext.userMemory?.personalInfo) {
      moodPrompt += `- Thông tin cá nhân: ${memoryContext.userMemory.personalInfo}\n`;
    }
    
    if (memoryContext.userMemory?.preferences) {
      moodPrompt += `- Sở thích: ${memoryContext.userMemory.preferences}\n`;
    }
    
    if (memoryContext.userMemory?.importantEvents) {
      moodPrompt += `- Sự kiện quan trọng: ${memoryContext.userMemory.importantEvents}\n`;
    }
    
    // Response style based on mood
    moodPrompt += `\nCÁCH TRẢ LỜI:\n`;
    if (['angry', 'sad'].includes(currentMood) && level > 60) {
      moodPrompt += `- CÓ THỂ chỉ thả icon thay vì trả lời: :/, :( , ?, gì?, ờ, không biết\n`;
      moodPrompt += `- Nếu trả lời thì NGẮN GỌN, ít tin nhắn\n`;
    } else if (['happy', 'playful', 'excited'].includes(currentMood)) {
      moodPrompt += `- Chia thành NHIỀU tin nhắn ngắn (3-5 tin)\n`;
      moodPrompt += `- Vui vẻ, nhiệt tình\n`;
    } else {
      moodPrompt += `- Bình thường, 2-3 tin nhắn\n`;
    }
    
    return moodPrompt;
  }

  /**
   * Check if should only send icon based on mood
   */
  static shouldSendIconOnly(mood: BotMood | null): string | null {
    if (!mood) return null;
    
    const { currentMood, moodLevel } = mood;
    
    // High intensity negative moods might just send icons
    if (moodLevel && moodLevel > 70) {
      if (currentMood === 'angry') {
        const icons = ['?', 'gì?', ':/'];
        return icons[Math.floor(Math.random() * icons.length)];
      }
      
      if (currentMood === 'sad') {
        const icons = [':(', 'ờ', 'không biết'];
        return icons[Math.floor(Math.random() * icons.length)];
      }
    }
    
    // Random chance for grumpy to just send icon
    if (currentMood === 'grumpy' && Math.random() < 0.2) {
      return ':)';
    }
    
    return null;
  }
}