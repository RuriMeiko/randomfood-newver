import { MessageConfig } from './gemini-ai.service';
import { log } from '@/utils/logger';

export interface TelegramAPI {
  sendMessage(chatId: string, text: string): Promise<any>;
  sendChatAction(chatId: string, action: string): Promise<any>;
}

export class MessageSenderService {
  private telegramAPI: TelegramAPI;

  constructor(telegramAPI: TelegramAPI) {
    this.telegramAPI = telegramAPI;
  }

  /**
   * Send response to Telegram with natural timing and splitting
   */
  async sendResponse(
    chatId: string,
    response: string,
    messageConfig?: MessageConfig
  ): Promise<void> {
    try {
      log.debug('MessageSenderService.sendResponse called', {
        chatId,
        hasResponse: !!response,
        responseLength: response?.length || 0,
        responsePreview: response?.substring(0, 50) || 'EMPTY',
        hasMessageConfig: !!messageConfig,
        shouldSplit: messageConfig?.shouldSplit || false,
        messageCount: messageConfig?.messages?.length || 0
      });

      // If no messageConfig or shouldSplit is false, send single message
      if (!messageConfig || !messageConfig.shouldSplit) {
        log.info('🔍 QUYẾT ĐỊNH GỬI 1 TIN DUY NHẤT', {
          chatId,
          hasMessageConfig: !!messageConfig,
          shouldSplit: messageConfig?.shouldSplit,
          reason: !messageConfig ? 'No messageConfig' : 'shouldSplit is false'
        });
        await this.sendSingleMessage(chatId, response);
        return;
      }

      log.info('🔍 QUYẾT ĐỊNH GỬI NHIỀU TIN NHẮN', {
        chatId,
        shouldSplit: messageConfig.shouldSplit,
        messageCount: messageConfig.messages?.length,
        messagesPreview: messageConfig.messages?.slice(0, 3).map(m => m.substring(0, 30))
      });

      // Send multiple messages with delays and typing indicators
      await this.sendMultipleMessages(chatId, messageConfig);

    } catch (error: any) {
      log.error('Error sending message response', error, { 
        chatId, 
        responseLength: response?.length || 0,
        responsePreview: response?.substring(0, 50) || 'EMPTY'
      });
      // Fallback: send original response as single message
      try {
        await this.sendSingleMessage(chatId, response);
      } catch (fallbackError: any) {
        log.error('Fallback message send also failed', fallbackError, { chatId });
      }
    }
  }

  /**
   * Send a single message
   */
  private async sendSingleMessage(chatId: string, text: string): Promise<void> {
    try {
      // Validate text is not empty
      if (!text || text.trim().length === 0) {
        log.warn('Attempted to send empty message, using fallback', { chatId });
        text = 'Xin lỗi, có lỗi xảy ra với tin nhắn.';
      }

      await this.telegramAPI.sendMessage(chatId, text.trim());
      log.debug('Single message sent successfully', { chatId, textLength: text.length });
    } catch (error: any) {
      log.error('Error sending single message', error, { chatId, textLength: text.length, text: text.substring(0, 50) });
      throw error;
    }
  }

  /**
   * Send multiple messages with natural timing
   */
  private async sendMultipleMessages(chatId: string, messageConfig: MessageConfig): Promise<void> {
    const { messages, delays, typingDuration } = messageConfig;

    if (!messages || messages.length === 0) {
      log.warn('No messages to send in messageConfig', { chatId });
      return;
    }

    log.info('📤 BẮT ĐẦU GỬI NHIỀU TIN NHẮN', {
      chatId,
      totalMessages: messages.length,
      delays: delays,
      typingDuration
    });

    try {
      for (let i = 0; i < messages.length; i++) {
        let message = messages[i];
        const delay = delays[i] || 1500; // Default 1.5s delay
        
        log.info(`📝 CHUẨN BỊ TIN NHẮN ${i + 1}/${messages.length}`, {
          chatId,
          messageIndex: i + 1,
          message: message.substring(0, 100),
          delay,
          messageLength: message.length
        });
        
        // Validate message is not empty
        if (!message || message.trim().length === 0) {
          log.warn('Skipping empty message in sequence', { chatId, messageIndex: i + 1 });
          continue;
        }
        
        message = message.trim();
        
        try {
          // Show typing indicator before sending each message
          log.debug(`⌨️ Showing typing indicator for message ${i + 1}`, { chatId, duration: typingDuration });
          await this.showTypingIndicator(chatId, typingDuration || this.calculateTypingDuration(message));
          
          // Send the message
          log.debug(`📤 Sending message ${i + 1}`, { chatId, text: message.substring(0, 50) });
          await this.telegramAPI.sendMessage(chatId, message);
          
          log.info(`✅ TIN NHẮN ${i + 1} ĐÃ GỬI THÀNH CÔNG`, { 
            chatId, 
            messageIndex: i + 1, 
            totalMessages: messages.length,
            messageLength: message.length,
            nextDelay: delay
          });

          // Wait before next message (except for the last message)
          if (i < messages.length - 1) {
            log.debug(`⏳ Đợi ${delay}ms trước tin nhắn tiếp theo`, { chatId, delay });
            await this.sleep(delay);
          }
          
        } catch (messageError: any) {
          log.error(`❌ LỖI GỬI TIN NHẮN ${i + 1}`, messageError, {
            chatId,
            messageIndex: i + 1,
            message: message.substring(0, 100),
            errorMessage: messageError.message
          });
          // Tiếp tục với tin nhắn tiếp theo thay vì throw
          continue;
        }
      }

      log.info('🎉 TẤT CẢ TIN NHẮN ĐÃ GỬI XONG', { 
        chatId, 
        totalMessages: messages.length,
        totalDelay: delays.reduce((sum, delay) => sum + delay, 0)
      });

    } catch (error: any) {
      log.error('💥 LỖI NGHIÊM TRỌNG KHI GỬI NHIỀU TIN NHẮN', error, { 
        chatId, 
        totalMessages: messages.length,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }

  /**
   * Show typing indicator for specified duration
   */
  private async showTypingIndicator(chatId: string, duration: number): Promise<void> {
    try {
      // Send typing action
      await this.telegramAPI.sendChatAction(chatId, 'typing');
      
      // Wait for the typing duration
      await this.sleep(duration);

    } catch (error: any) {
      log.warn('Error showing typing indicator', error, { chatId, duration });
      // Don't throw error - typing indicator is not critical
    }
  }

  /**
   * Calculate natural typing duration based on message length (shorter for natural feel)
   */
  private calculateTypingDuration(message: string): number {
    const baseTime = 500; // 0.5 second base
    const charTime = 15; // 15ms per character (faster)
    const maxTime = 1200; // Maximum 1.2 seconds (much shorter)
    const minTime = 400; // Minimum 0.4 seconds

    const calculatedTime = baseTime + (message.length * charTime);
    return Math.min(Math.max(calculatedTime, minTime), maxTime);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create default messageConfig for single response
   */
  static createSingleMessageConfig(response: string): MessageConfig {
    return {
      shouldSplit: false,
      messages: [response],
      delays: [],
      typingDuration: 1000
    };
  }

  /**
   * Create natural messageConfig for long responses
   */
  static createNaturalSplitConfig(response: string): MessageConfig {
    // Simple splitting by sentences
    const sentences = response.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 1 || response.length < 100) {
      return this.createSingleMessageConfig(response);
    }

    // Group sentences into natural message chunks
    const messages: string[] = [];
    let currentMessage = '';
    
    for (const sentence of sentences) {
      if (currentMessage.length + sentence.length < 80) {
        currentMessage += (currentMessage ? '. ' : '') + sentence;
      } else {
        if (currentMessage) {
          messages.push(currentMessage + '.');
        }
        currentMessage = sentence;
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage + (currentMessage.endsWith('.') ? '' : '.'));
    }

    // Generate natural delays
    const delays = messages.map((msg, index) => {
      const baseDelay = 1200;
      const lengthFactor = Math.min(msg.length * 20, 2000);
      const randomFactor = Math.random() * 500; // 0-500ms random
      return Math.floor(baseDelay + lengthFactor + randomFactor);
    });

    return {
      shouldSplit: true,
      messages,
      delays,
      typingDuration: 1500
    };
  }
}