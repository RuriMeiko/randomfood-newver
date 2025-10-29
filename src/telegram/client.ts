import type { TelegramBot } from '@/bot/types';
import { log } from '@/utils/logger';

export class TelegramClient implements TelegramBot {
  private baseUrl: string;

  constructor(private token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(
    text: string, 
    chatId: string, 
    threadId?: number, 
    keyboard?: any
  ): Promise<any> {
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: keyboard 
        ? { inline_keyboard: keyboard }
        : { remove_keyboard: true },
      message_thread_id: threadId,
    };

    try {
      log.api.call('POST', `${this.baseUrl}/sendMessage`, { 
        chatId, 
        textLength: text.length,
        hasKeyboard: !!keyboard,
        threadId 
      });
      
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json() as any;
      
      // Enhanced error logging
      if (!response.ok || !result.ok) {
        log.error(`Telegram API Error: ${response.status}`, undefined, {
          chatId,
          status: response.status,
          statusText: response.statusText,
          telegramErrorCode: result.error_code,
          telegramDescription: result.description,
          requestBody: body,
          fullResponse: result
        });
      } else {
        log.api.response('POST', '/sendMessage', response.status, { 
          chatId, 
          success: result.ok,
          messageId: result.result?.message_id 
        });
      }
      
      return result;
    } catch (error: any) {
      log.error('Network Error sending message', error, { 
        chatId, 
        textLength: text.length,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return { ok: false, error: error.message };
    }
  }

  async sendPhoto(
    photoUrl: string, 
    chatId: string, 
    caption?: string, 
    threadId?: number
  ): Promise<any> {
    const body = {
      chat_id: chatId,
      photo: photoUrl,
      parse_mode: 'HTML',
      caption: caption || '',
      reply_markup: { remove_keyboard: true },
      message_thread_id: threadId,
    };

    try {
      log.api.call('POST', `${this.baseUrl}/sendPhoto`, { 
        chatId, 
        photoUrl: photoUrl.substring(0, 100) + '...', // Truncate URL for logging
        captionLength: caption?.length || 0,
        threadId 
      });

      const response = await fetch(`${this.baseUrl}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json() as any;
      
      if (!response.ok || !result.ok) {
        log.error(`Telegram API Error: ${response.status}`, undefined, {
          chatId,
          method: 'sendPhoto',
          status: response.status,
          statusText: response.statusText,
          telegramErrorCode: result.error_code,
          telegramDescription: result.description,
          photoUrl: photoUrl.substring(0, 100) + '...',
          fullResponse: result
        });
      } else {
        log.api.response('POST', '/sendPhoto', response.status, { 
          chatId, 
          success: result.ok,
          messageId: result.result?.message_id 
        });
      }

      return result;
    } catch (error: any) {
      log.error('Network Error sending photo', error, { 
        chatId, 
        photoUrl: photoUrl.substring(0, 100) + '...',
        errorMessage: error.message,
        errorStack: error.stack
      });
      return { ok: false, error: error.message };
    }
  }

  async sendSticker(
    stickerId: string, 
    chatId: string, 
    threadId?: number
  ): Promise<any> {
    const body = {
      chat_id: chatId,
      sticker: stickerId,
      reply_markup: { remove_keyboard: true },
      message_thread_id: threadId,
    };

    try {
      const response = await fetch(`${this.baseUrl}/sendSticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error: any) {
      log.error('Network Error sending sticker', error, { 
        chatId,
        stickerId,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return { ok: false, error: error.message };
    }
  }

  async editMessage(
    text: string, 
    chatId: string, 
    messageId: number, 
    keyboard?: any
  ): Promise<any> {
    const body = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: keyboard 
        ? { inline_keyboard: keyboard }
        : { remove_keyboard: true },
    };

    try {
      log.api.call('POST', `${this.baseUrl}/editMessageText`, { 
        chatId, 
        messageId, 
        textLength: text.length,
        hasKeyboard: !!keyboard
      });

      const response = await fetch(`${this.baseUrl}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json() as any;
      
      if (!response.ok || !result.ok) {
        log.error(`Telegram API Error: ${response.status}`, undefined, {
          chatId,
          messageId,
          method: 'editMessageText',
          status: response.status,
          statusText: response.statusText,
          telegramErrorCode: result.error_code,
          telegramDescription: result.description,
          fullResponse: result
        });
      } else {
        log.api.response('POST', '/editMessageText', response.status, { 
          chatId, 
          messageId,
          success: result.ok
        });
      }

      return result;
    } catch (error: any) {
      log.error('Network Error editing message', error, { 
        chatId,
        messageId,
        textLength: text.length,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return { ok: false, error: error.message };
    }
  }

  async answerCallbackQuery(
    callbackId: string, 
    text?: string
  ): Promise<any> {
    const body = {
      callback_query_id: callbackId,
      text: text,
      show_alert: false,
    };

    try {
      log.api.call('POST', `${this.baseUrl}/answerCallbackQuery`, { 
        callbackId, 
        hasText: !!text,
        textLength: text?.length || 0
      });

      const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json() as any;
      
      if (!response.ok || !result.ok) {
        log.error(`Telegram API Error: ${response.status}`, undefined, {
          callbackId,
          method: 'answerCallbackQuery',
          status: response.status,
          statusText: response.statusText,
          telegramErrorCode: result.error_code,
          telegramDescription: result.description,
          fullResponse: result
        });
      } else {
        log.api.response('POST', '/answerCallbackQuery', response.status, { 
          callbackId, 
          success: result.ok
        });
      }

      return result;
    } catch (error: any) {
      log.error('Network Error answering callback query', error, { 
        callbackId,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return { ok: false, error: error.message };
    }
  }

  async getMe(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json() as any;
      return result.ok ? result.result : null;
    } catch (error: any) {
      console.error('Error getting bot info:', error.message);
      return null;
    }
  }
}