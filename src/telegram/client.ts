import type { TelegramBot } from '@/bot/types';

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
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error: any) {
      console.error('Error sending message:', error.message);
      return null;
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
      const response = await fetch(`${this.baseUrl}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error: any) {
      console.error('Error sending photo:', error.message);
      return null;
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
      console.error('Error sending sticker:', error.message);
      return null;
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
      const response = await fetch(`${this.baseUrl}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error: any) {
      console.error('Error editing message:', error.message);
      return null;
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
      const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error: any) {
      console.error('Error answering callback query:', error.message);
      return null;
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